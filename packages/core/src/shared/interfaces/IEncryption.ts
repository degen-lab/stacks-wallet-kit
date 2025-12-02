import { Wallet, WalletEnvelope } from '../types/backupTypes'

export interface IEncryptionManager {
  encryptWallet(
    password: string,
    wallet: Wallet,
    mnemonic: string
  ): Promise<{
    encryptedWallet: string
    encryptedMnemonic: string
    salt: string
    walletNonce: string
    mnemonicNonce: string
    wrappedMasterKey: string
    wrapNonce: string
    iterations: number
  }>
  decryptMnemonic(
    password: string,
    salt: string,
    wrapNonce: string,
    wrappedMasterKey: string,
    mnemonicNonce: string,
    encryptedMnemonic: string
  ): Promise<string>
  decryptWallet(
    password: string,
    envelope: WalletEnvelope
  ): Promise<{ wallet: Wallet; mnemonic: string }>
}
