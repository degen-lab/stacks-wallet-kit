import {
  ClarityValue,
  PostConditionMode,
  StacksTransactionWire,
} from '@stacks/transactions'
import { StackingPool } from '../../stacks/utils/types'
import {
  AuthProvider,
  AuthenticatedUser,
  GoogleAuthenticatedUser,
} from '../types/authTypes'
import {
  BackupWriteResult,
  NetworkType,
  Wallet,
  WalletAccount,
} from '../types/backupTypes'

export interface ISDKFacade {
  signIn(provider: AuthProvider): Promise<{ user: AuthenticatedUser }>
  signOut(): Promise<void>

  createWallet(passphrase?: string): Promise<Wallet>
  storeExistingWallet(mnemonic: string, passphrase?: string): Promise<Wallet>
  createAccount(): Promise<WalletAccount>
  getWalletAccounts(): Promise<WalletAccount[]>

  getBackupAvailability(provider: AuthProvider): Promise<boolean>
  hasBackup(provider?: AuthProvider): Promise<boolean>
  backupWallet(
    password: string,
    targets?: AuthProvider[]
  ): Promise<BackupWriteResult>
  retrieveWalletFromProvider(
    password: string,
    provider: AuthProvider
  ): Promise<{ wallet: Wallet; mnemonic: string }>
  deleteBackup(provider?: AuthProvider): Promise<void>
  /**
   * @deprecated Use `signIn('google')` and `hasBackup('google')` instead.
   */
  loginWithGoogle(): Promise<{
    accessToken: string
    idToken: string
    hasBackup: boolean
    userData: GoogleAuthenticatedUser
  }>
  /**
   * @deprecated Use `retrieveWalletFromProvider(password, 'google')` instead.
   */
  retrieveWallet(
    password: string
  ): Promise<{ wallet: Wallet; mnemonic: string }>
  /**
   * @deprecated Use `deleteBackup('google')` instead.
   */
  deleteBackupWithoutPassword(): Promise<void>

  getBalance(account: WalletAccount): Promise<number>
  setNetwork(network: NetworkType): void

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

  makeContractCall(
    contractAddress: string,
    functionName: string,
    functionArgs: ClarityValue[],
    postConditionMode?: PostConditionMode,
    fee?: number,
    accountIndex?: number
  ): Promise<string>

  signTransaction(
    accountIndex: number,
    transaction: StacksTransactionWire
  ): Promise<StacksTransactionWire>
}
