import {
  ClarityValue,
  PostConditionMode,
  StacksTransactionWire,
} from '@stacks/transactions'
import { NetworkType, WalletAccount } from '../types/backupTypes'

export interface IStacksClient {
  getBalance(account: WalletAccount): Promise<number>
  sendStx(
    from: string,
    to: string,
    amount: number,
    network: NetworkType,
    memo?: string
  ): Promise<string>

  transferNFT(
    contractId: string,
    tokenId: string,
    senderKey: string,
    senderAddress: string,
    to: string,
    network: NetworkType
  ): Promise<string>
  transferFT(
    contractId: string,
    amount: number,
    senderKey: string,
    senderAddress: string,
    to: string,
    network: NetworkType
  ): Promise<string>

  getPoxData(): Promise<{
    currentBurnHeight: number
    minimumThreshold: number
    currentRewardCycle: number
    nextRewardCycle: number
  }>
  setNetwork(network: NetworkType): void

  makeContractCall(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: ClarityValue[],
    senderKey: string,
    postConditionMode?: PostConditionMode
  ): Promise<string>

  signTranasction(
    transaction: StacksTransactionWire,
    privateKey: string
  ): StacksTransactionWire
}
