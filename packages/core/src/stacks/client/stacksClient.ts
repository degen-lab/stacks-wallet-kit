import {
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  StacksTransactionWire,
  noneCV,
  standardPrincipalCV,
  uintCV,
  PostConditionMode,
  ClarityValue,
} from '@stacks/transactions'
import { createNetwork, StacksNetwork } from '@stacks/network'
import { IStacksClient, NetworkType, WalletAccount } from '../../shared/index'
import {
  GET_BALANCE,
  GET_POX_INF0,
  TRANSFER_FUNCTION_NAME,
} from '../utils/constants'

export class StacksClient implements IStacksClient {
  private baseUrl: string

  constructor(
    private network: NetworkType,
    private mainnetBaseUrl: string,
    private testnetBaseUrl: string,
    private devnetBaseUrl: string
  ) {
    this.baseUrl =
      network === NetworkType.Mainnet
        ? this.mainnetBaseUrl
        : network === NetworkType.Testnet
          ? this.testnetBaseUrl
          : this.devnetBaseUrl
  }

  async makeContractCall(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: ClarityValue[],
    senderKey: string,
    postConditionMode: PostConditionMode = PostConditionMode.Deny
  ): Promise<string> {
    const networkObject = this.getNetworkObject(this.network)
    const transaction = await makeContractCall({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      senderKey,
      network: networkObject,
      postConditionMode,
    })
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
    } = { transaction }
    if (this.network === NetworkType.Devnet) {
      broadcastOptions.network = networkObject
    }
    const result = await broadcastTransaction(broadcastOptions)
    return result.txid
  }

  setNetwork(network: NetworkType): void {
    this.network = network
    this.baseUrl =
      network === NetworkType.Mainnet
        ? this.mainnetBaseUrl
        : network === NetworkType.Testnet
          ? this.testnetBaseUrl
          : this.devnetBaseUrl
  }

  async getPoxData(): Promise<{
    currentBurnHeight: number
    minimumThreshold: number
    currentRewardCycle: number
    nextRewardCycle: number
  }> {
    const baseUrl = this.baseUrl.endsWith('/')
      ? this.baseUrl
      : `${this.baseUrl}/`
    const response = await fetch(`${baseUrl}${GET_POX_INF0}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
    const body = await response.json()
    return {
      currentBurnHeight: Number(body.current_burnchain_block_height),
      minimumThreshold: Number(body.next_cycle.min_threshold_ustx),
      currentRewardCycle: Number(body.current_cycle.id),
      nextRewardCycle: Number(body.next_cycle.id),
    }
  }

  async getBalance(account: WalletAccount): Promise<number> {
    const address =
      this.network === NetworkType.Mainnet
        ? account.addresses.mainnet
        : account.addresses.testnet
    const baseUrl = this.baseUrl.endsWith('/')
      ? this.baseUrl
      : `${this.baseUrl}/`
    const url = `${baseUrl}${GET_BALANCE(address)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get balance: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const body = await response.json()
    const microStx: number = body.balance
    const balance = microStx / 1000000

    return balance
  }

  async sendStx(
    from: string,
    to: string,
    amount: number,
    network: NetworkType,
    memo?: string
  ): Promise<string> {
    const microStx = Math.floor(amount * 1000000)
    const microStxBigInt = BigInt(String(microStx))

    const networkObject = this.getNetworkObject(network)

    const txOptions = {
      recipient: to,
      amount: microStxBigInt,
      senderKey: from,
      network: networkObject,
      memo,
    }

    const transaction = await makeSTXTokenTransfer(txOptions)

    const broadcastOptions: {
      transaction: StacksTransactionWire
      network?: StacksNetwork
    } =
      network === NetworkType.Devnet
        ? { transaction, network: networkObject }
        : { transaction }

    const response = await broadcastTransaction(broadcastOptions)

    if (!response?.txid) {
      throw new Error(
        `Broadcast failed: No txid in response. Response: ${JSON.stringify(response)}`
      )
    }

    return response.txid
  }

  // TODO: Add memo support
  async transferNFT(
    contractId: string,
    tokenId: string,
    senderKey: string,
    senderAddress: string,
    to: string,
    network: NetworkType
  ): Promise<string> {
    const [contractAddress, contractName] = contractId.split('.')
    const networkObject = this.getNetworkObject(network)
    const functionArgs = [
      uintCV(tokenId),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(to),
    ]

    const transaction = await makeContractCall({
      contractAddress,
      contractName,
      functionName: TRANSFER_FUNCTION_NAME,
      functionArgs,
      senderKey,
      network: networkObject,
      postConditionMode: PostConditionMode.Allow,
    })
    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
    } = { transaction }
    if (network === NetworkType.Devnet) {
      broadcastOptions.network = networkObject
    }
    const result = await broadcastTransaction(broadcastOptions)
    return result.txid
  }

  // TODO: Add memo support
  async transferFT(
    contractId: string,
    amount: number,
    senderKey: string,
    senderAddress: string,
    to: string,
    network: NetworkType
  ): Promise<string> {
    const [contractAddress, contractName] = contractId.split('.')
    const networkObject = this.getNetworkObject(network)
    const functionArgs = [
      uintCV(amount),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(to),
      noneCV(), // memo (optional)
    ]
    const transaction = await makeContractCall({
      contractAddress,
      contractName,
      functionName: TRANSFER_FUNCTION_NAME,
      functionArgs,
      senderKey,
      network: networkObject,
      postConditionMode: PostConditionMode.Allow,
    })

    const broadcastOptions: {
      transaction: typeof transaction
      network?: StacksNetwork
    } = { transaction }
    if (network === NetworkType.Devnet) {
      broadcastOptions.network = networkObject
    }
    const result = await broadcastTransaction(broadcastOptions)
    return result.txid
  }

  setStacksNetwork(newNetwork: NetworkType): void {
    this.network = newNetwork
    this.baseUrl =
      newNetwork === NetworkType.Mainnet
        ? this.mainnetBaseUrl
        : newNetwork === NetworkType.Testnet
          ? this.testnetBaseUrl
          : this.devnetBaseUrl
  }

  private getNetworkObject(network: NetworkType): StacksNetwork {
    if (network === NetworkType.Devnet) {
      const baseUrl = this.baseUrl.endsWith('/')
        ? this.baseUrl.slice(0, -1)
        : this.baseUrl

      return createNetwork({
        network: 'devnet',
        client: {
          baseUrl,
          fetch: fetch,
        },
      })
    }
    return createNetwork(
      network === NetworkType.Mainnet ? 'mainnet' : 'testnet'
    )
  }
}
