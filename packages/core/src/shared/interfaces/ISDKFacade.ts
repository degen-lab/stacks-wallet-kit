import {
  ClarityValue,
  PostConditionMode,
  StacksTransactionWire,
} from '@stacks/transactions'
import { StackingPool } from '../../stacks/utils/types'
import { NetworkType, User, Wallet, WalletAccount } from '../types/backupTypes'

export interface ISDKFacade {
  loginWithGoogle(): Promise<{
    accessToken: string
    hasBackup: boolean
    userData: User | undefined
  }>
  createWallet(passphrase?: string): Promise<Wallet>
  backupWallet(password: string): Promise<void>
  retrieveWallet(password: string): Promise<{
    wallet: Wallet
    mnemonic: string
  }>
  signOut(): Promise<void>
  deleteBackup(password: string): Promise<void>
  getWalletAccounts(): Promise<WalletAccount[]>
  getBalance(account: WalletAccount): Promise<number>
  sendStx(
    accountIndex: number,
    to: string,
    amount: number,
    network: NetworkType,
    memo?: string
  ): Promise<string>

  transferNFT(
    accountIndex: number,
    contractId: string,
    tokenId: string,
    to: string,
    network: NetworkType
  ): Promise<string>

  transferFT(
    accountIndex: number,
    contractId: string,
    amount: number,
    to: string,
    network: NetworkType
  ): Promise<string>
  deleteBackupWithoutPassword(): Promise<void>

  stackSTX(
    account: WalletAccount,
    amount: number,
    lockPeriod: number,
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string>
  stackExtend(
    account: WalletAccount,
    extendCount: number,
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string>
  stackIncrease(
    account: WalletAccount,
    increaseBy: number,
    maxAmount: number,
    currentLockPeriod: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string>

  delegateSTX(
    account: WalletAccount,
    amount: number,
    delegateTo: StackingPool,
    untilBurnHeight?: number
  ): Promise<string>
  revokeDelegation(account: WalletAccount): Promise<string>

  setNetwork(network: NetworkType): void

  storeExistingWallet(mnemonic: string, passphrase?: string): Promise<Wallet>

  createAccount(): Promise<WalletAccount>

  makeContractCall(
    contractAddress: string,
    functionName: string,
    functionArgs: ClarityValue[],
    postConditionMode?: PostConditionMode,
    fee?: number
  ): Promise<string>

  signTransaction(
    accountIndex: number,
    transaction: StacksTransactionWire
  ): Promise<StacksTransactionWire>
}
