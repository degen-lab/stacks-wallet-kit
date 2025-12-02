import { Wallet } from '../types/backupTypes'

export interface IWalletManager {
  createWallet(
    passphrase?: string
  ): Promise<{ wallet: Wallet; mnemonic: string }>
  createAccount(wallet: Wallet): Wallet
  createExistingWallet(mnemonic: string, passphrase?: string): Promise<Wallet>
}
