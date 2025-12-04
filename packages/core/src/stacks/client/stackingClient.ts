import {
  broadcastTransaction,
  bufferCV,
  ClarityValue,
  makeContractCall,
  noneCV,
  PostConditionMode,
  principalCV,
  someCV,
  uintCV,
} from '@stacks/transactions'
import { hexToBytes } from '@stacks/common'
import { createNetwork, StacksNetwork } from '@stacks/network'
import { poxAddressToTuple } from '@stacks/stacking'
import { stxToUstx } from '../utils/walletHelpers'
import { IStackingClient, SigningError, NetworkType } from '../../shared'
import {
  MAINNET_POX_ADDRESS,
  SIGNATURE_ENDPOINT,
  TESTNET_POX_ADDRESS,
} from '../utils/constants'
import { SignatureResponse, SignatureTopic, StackingPool } from '../utils/types'

export class StackingClient implements IStackingClient {
  constructor(
    private network: NetworkType,
    private devnetBaseUrl: string
  ) {
    this.network = network
  }

  setNetwork(network: NetworkType): void {
    this.network = network
  }

  async delegateStx(
    senderKey: string,
    pool: StackingPool,
    amount: number,
    options?: {
      untilBurnHeight?: number
      btcAddresses?: { mainnet: string; testnet: string }
    }
  ): Promise<string> {
    const btcAddress = options?.btcAddresses
      ? this.network === NetworkType.Mainnet
        ? options.btcAddresses.mainnet
        : options.btcAddresses.testnet
      : undefined
    const addressCv = principalCV(pool.address)
    const amountCv = uintCV(stxToUstx(amount))
    const untilBurnHeightCv =
      options?.untilBurnHeight !== undefined
        ? someCV(uintCV(options.untilBurnHeight))
        : noneCV()
    const contractAddress =
      this.network === NetworkType.Mainnet
        ? MAINNET_POX_ADDRESS
        : TESTNET_POX_ADDRESS
    const poxAddress =
      btcAddress !== undefined
        ? someCV(poxAddressToTuple(btcAddress))
        : noneCV()
    const functionArgs: ClarityValue[] = [
      amountCv,
      addressCv,
      untilBurnHeightCv,
      poxAddress,
    ]
    const txOptions = {
      contractAddress,
      contractName: 'pox-4',
      functionName: 'delegate-stx',
      functionArgs,
      senderKey,
      network: this.getNetworkObject(),
      postConditionMode: PostConditionMode.Deny,
    }
    const transaction = await makeContractCall(txOptions)
    // Wrap fetch in a function to preserve context when passed to broadcastTransaction
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
      client?: { fetch: typeof fetch }
    } = { transaction, client: { fetch: fetchWrapper } }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = this.getNetworkObject()
    }
    const response = await broadcastTransaction(broadcastOptions)
    return response.txid
  }

  async revokeDelegation(senderKey: string): Promise<string> {
    const contractAddress =
      this.network === NetworkType.Mainnet
        ? MAINNET_POX_ADDRESS
        : TESTNET_POX_ADDRESS

    const functionArgs: ClarityValue[] = []

    const txOptions = {
      contractAddress,
      contractName: 'pox-4',
      functionName: 'revoke-delegate-stx',
      functionArgs,
      senderKey,
      network: this.getNetworkObject(),
      postConditionMode: PostConditionMode.Deny,
    }

    const transaction = await makeContractCall(txOptions)

    // Wrap fetch in a function to preserve context when passed to broadcastTransaction
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
      client?: { fetch: typeof fetch }
    } = { transaction, client: { fetch: fetchWrapper } }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = this.getNetworkObject()
    }
    const response = await broadcastTransaction(broadcastOptions)
    return response.txid
  }

  async stackExtend(
    senderKey: string,
    rewardCycle: number,
    extendCount: number,
    btcAddresses: { mainnet: string; testnet: string },
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const btcAddress =
      this.network === NetworkType.Mainnet
        ? btcAddresses.mainnet
        : btcAddresses.testnet
    // Backend converts maxAmount from STX to uSTX internally
    const signerData: SignatureResponse = options
      ? {
          method: 'stack-extend',
          period: extendCount,
          rewardCycle,
          maxAmount: Number(stxToUstx(maxAmount)),
          signerSignature: options.signerSignature,
          signerKey: options.signerKey,
          authId: options.authId,
          poxAddress: btcAddress,
        }
      : await this.generateSignature(
          rewardCycle,
          btcAddress,
          maxAmount, // Send maxAmount in STX (backend converts to uSTX)
          extendCount,
          SignatureTopic['stack-extend'],
          this.network
        )

    const extendCountCv = uintCV(extendCount)
    const responseMaxAmount =
      typeof signerData.maxAmount === 'string'
        ? BigInt(signerData.maxAmount)
        : BigInt(Math.floor(Number(signerData.maxAmount)))

    let signerKey: string
    if (Buffer.isBuffer(signerData.signerKey)) {
      signerKey = signerData.signerKey.toString('hex')
    } else if (typeof signerData.signerKey === 'string') {
      signerKey = signerData.signerKey
    } else {
      throw new Error(
        `Invalid signerKey type: expected string or Buffer, got ${typeof signerData.signerKey}`
      )
    }

    if (signerKey.startsWith('0x') || signerKey.startsWith('0X')) {
      signerKey = signerKey.slice(2)
    }

    let signerSigHex: string
    if (Buffer.isBuffer(signerData.signerSignature)) {
      signerSigHex = signerData.signerSignature.toString('hex')
    } else if (typeof signerData.signerSignature === 'string') {
      signerSigHex = signerData.signerSignature
    } else {
      throw new Error(
        `Invalid signerSignature type: expected string or Buffer, got ${typeof signerData.signerSignature}`
      )
    }

    if (signerSigHex.startsWith('0x') || signerSigHex.startsWith('0X')) {
      signerSigHex = signerSigHex.slice(2)
    }

    const poxAddressCv = poxAddressToTuple(btcAddress)
    const contractAddress =
      this.network === NetworkType.Mainnet
        ? MAINNET_POX_ADDRESS
        : TESTNET_POX_ADDRESS

    const functionArgs: ClarityValue[] = [
      extendCountCv,
      poxAddressCv,
      signerSigHex ? someCV(bufferCV(hexToBytes(signerSigHex))) : noneCV(),
      bufferCV(hexToBytes(signerKey)),
      uintCV(responseMaxAmount),
      uintCV(Number(signerData.authId)),
    ]

    const txOptions = {
      contractAddress,
      contractName: 'pox-4',
      functionName: 'stack-extend',
      functionArgs,
      senderKey,
      network: this.getNetworkObject(),
      postConditionMode: PostConditionMode.Deny,
    }

    const transaction = await makeContractCall(txOptions)

    // Wrap fetch in a function to preserve context when passed to broadcastTransaction
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
      client?: { fetch: typeof fetch }
    } = { transaction, client: { fetch: fetchWrapper } }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = this.getNetworkObject()
    }
    const response = await broadcastTransaction(broadcastOptions)
    return response.txid
  }

  async stackStx(
    senderKey: string,
    rewardCycle: number,
    amount: number,
    btcAddresses: { mainnet: string; testnet: string },
    startBurnHeight: number,
    period: number,
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const btcAddress =
      this.network === NetworkType.Mainnet
        ? btcAddresses.mainnet
        : btcAddresses.testnet

    const signerData: SignatureResponse = options
      ? {
          method: 'stack-stx',
          period,
          rewardCycle,
          maxAmount: Number(stxToUstx(maxAmount)),
          signerSignature: options.signerSignature,
          signerKey: options.signerKey,
          authId: options.authId,
          poxAddress: btcAddress,
        }
      : await this.generateSignature(
          rewardCycle,
          btcAddress,
          maxAmount,
          period,
          SignatureTopic['stack-stx'],
          this.network
        )

    const ustxAmount = stxToUstx(amount)
    const responseMaxAmount =
      typeof signerData.maxAmount === 'string'
        ? BigInt(signerData.maxAmount)
        : BigInt(Math.floor(Number(signerData.maxAmount)))

    let signerKey: string
    if (Buffer.isBuffer(signerData.signerKey)) {
      signerKey = signerData.signerKey.toString('hex')
    } else if (typeof signerData.signerKey === 'string') {
      signerKey = signerData.signerKey
    } else {
      throw new Error(
        `Invalid signerKey type: expected string or Buffer, got ${typeof signerData.signerKey}`
      )
    }

    if (signerKey.startsWith('0x') || signerKey.startsWith('0X')) {
      signerKey = signerKey.slice(2)
    }

    let signerSigHex: string
    if (Buffer.isBuffer(signerData.signerSignature)) {
      signerSigHex = signerData.signerSignature.toString('hex')
    } else if (typeof signerData.signerSignature === 'string') {
      signerSigHex = signerData.signerSignature
    } else {
      throw new Error(
        `Invalid signerSignature type: expected string or Buffer, got ${typeof signerData.signerSignature}`
      )
    }

    if (signerSigHex.startsWith('0x') || signerSigHex.startsWith('0X')) {
      signerSigHex = signerSigHex.slice(2)
    }

    const poxAddressCv = poxAddressToTuple(btcAddress)
    const contractAddress =
      this.network === NetworkType.Mainnet
        ? MAINNET_POX_ADDRESS
        : TESTNET_POX_ADDRESS

    const functionArgs: ClarityValue[] = [
      uintCV(ustxAmount),
      poxAddressCv,
      uintCV(startBurnHeight),
      uintCV(period),
    ]

    if (
      signerKey &&
      responseMaxAmount &&
      typeof signerData.authId !== 'undefined'
    ) {
      functionArgs.push(
        signerSigHex ? someCV(bufferCV(hexToBytes(signerSigHex))) : noneCV()
      )
      functionArgs.push(bufferCV(hexToBytes(signerKey)))
      functionArgs.push(uintCV(responseMaxAmount))
      functionArgs.push(uintCV(Number(signerData.authId)))
    }

    const txOptions = {
      contractAddress,
      contractName: 'pox-4',
      functionName: 'stack-stx',
      functionArgs,
      senderKey,
      network: this.getNetworkObject(),
      postConditionMode: PostConditionMode.Deny,
    }

    const transaction = await makeContractCall(txOptions)

    // Wrap fetch in a function to preserve context when passed to broadcastTransaction
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
      client?: { fetch: typeof fetch }
    } = { transaction, client: { fetch: fetchWrapper } }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = this.getNetworkObject()
    }
    const response = await broadcastTransaction(broadcastOptions)
    return response.txid
  }

  async stackIncrease(
    senderKey: string,
    rewardCycle: number,
    btcAddresses: { mainnet: string; testnet: string },
    increaseBy: number,
    maxAmount: number,
    currentLockPeriod: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const btcAddress =
      this.network === NetworkType.Mainnet
        ? btcAddresses.mainnet
        : btcAddresses.testnet
    // Backend converts maxAmount from STX to uSTX internally
    const signerData: SignatureResponse = options
      ? {
          method: 'stack-increase',
          period: currentLockPeriod,
          rewardCycle,
          maxAmount: Number(stxToUstx(maxAmount)),
          signerSignature: options.signerSignature,
          signerKey: options.signerKey,
          authId: options.authId,
          poxAddress: btcAddress,
        }
      : await this.generateSignature(
          rewardCycle,
          btcAddress,
          maxAmount, // Send maxAmount in STX (backend converts to uSTX)
          currentLockPeriod,
          SignatureTopic['stack-increase'],
          this.network
        )

    const ustxIncreaseBy = stxToUstx(increaseBy)
    const increaseByCv = uintCV(ustxIncreaseBy)
    const responseMaxAmount =
      typeof signerData.maxAmount === 'string'
        ? BigInt(signerData.maxAmount)
        : BigInt(Math.floor(Number(signerData.maxAmount)))

    let signerKey: string
    if (Buffer.isBuffer(signerData.signerKey)) {
      signerKey = signerData.signerKey.toString('hex')
    } else if (typeof signerData.signerKey === 'string') {
      signerKey = signerData.signerKey
    } else {
      throw new Error(
        `Invalid signerKey type: expected string or Buffer, got ${typeof signerData.signerKey}`
      )
    }

    if (signerKey.startsWith('0x') || signerKey.startsWith('0X')) {
      signerKey = signerKey.slice(2)
    }

    let signerSigHex: string
    if (Buffer.isBuffer(signerData.signerSignature)) {
      signerSigHex = signerData.signerSignature.toString('hex')
    } else if (typeof signerData.signerSignature === 'string') {
      signerSigHex = signerData.signerSignature
    } else {
      throw new Error(
        `Invalid signerSignature type: expected string or Buffer, got ${typeof signerData.signerSignature}`
      )
    }

    if (signerSigHex.startsWith('0x') || signerSigHex.startsWith('0X')) {
      signerSigHex = signerSigHex.slice(2)
    }

    const contractAddress =
      this.network === NetworkType.Mainnet
        ? MAINNET_POX_ADDRESS
        : TESTNET_POX_ADDRESS

    const functionArgs: ClarityValue[] = [
      increaseByCv,
      signerSigHex ? someCV(bufferCV(hexToBytes(signerSigHex))) : noneCV(),
      bufferCV(hexToBytes(signerKey)),
      uintCV(responseMaxAmount),
      uintCV(Number(signerData.authId)),
    ]

    const txOptions = {
      contractAddress,
      contractName: 'pox-4',
      functionName: 'stack-increase',
      functionArgs,
      senderKey,
      network: this.getNetworkObject(),
      postConditionMode: PostConditionMode.Deny,
    }

    const transaction = await makeContractCall(txOptions)

    // Wrap fetch in a function to preserve context when passed to broadcastTransaction
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
      client?: { fetch: typeof fetch }
    } = { transaction, client: { fetch: fetchWrapper } }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = this.getNetworkObject()
    }
    const response = await broadcastTransaction(broadcastOptions)
    return response.txid
  }

  private async generateSignature(
    rewardCycle: number,
    poxAddress: string,
    maxAmount: number,
    period: number,
    topic: SignatureTopic,
    network: NetworkType
  ): Promise<SignatureResponse> {
    const topicString =
      Object.keys(SignatureTopic).find(
        (key) => SignatureTopic[key as keyof typeof SignatureTopic] === topic
      ) || topic.toString()

    const endpoint =
      network === NetworkType.Devnet
        ? 'http://localhost:7070/'
        : SIGNATURE_ENDPOINT

    const requestBody = {
      rewardCycle,
      poxAddress,
      maxAmount,
      period,
      topic: topicString,
      network,
    }

    // Wrap fetch in a function to preserve context (platform-agnostic)
    const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, init)
    const response = await fetchWrapper(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new SigningError(
        `Failed to sign transaction: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data: SignatureResponse = await response.json()
    return data
  }

  private getNetworkObject(): StacksNetwork {
    if (this.network === NetworkType.Devnet) {
      const baseUrl = this.devnetBaseUrl.endsWith('/')
        ? this.devnetBaseUrl.slice(0, -1)
        : this.devnetBaseUrl
      // Wrap fetch in a function to preserve context (platform-agnostic)
      const fetchWrapper = (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, init)
      return createNetwork({
        network: 'devnet',
        client: {
          baseUrl,
          fetch: fetchWrapper,
        },
      })
    }
    return createNetwork(
      this.network === NetworkType.Mainnet ? 'mainnet' : 'testnet'
    )
  }
}
