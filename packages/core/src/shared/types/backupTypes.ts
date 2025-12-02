export type WalletEnvelope = {
  version: 1
  walletId: string
  createdAt: Date
  mnemonic: string
  mnemonicNonce: string
  wallet: string
  walletNonce: string
  accountsCount: number
  salt: string
  protection: {
    kdf: {
      name: 'pbkdf2'
      iterations: number
      salt: string
    }
    wrappedMasterKey: string
    wrapNonce: string
  }
}

export type GoogleDriveBackupEntry = {
  id?: string
  name?: string | null
  appProperties?: {
    walletName?: string | null
  } | null
  properties?: Record<string, string | null> | null
}

export enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Devnet = 'devnet',
}

export type WalletAccount = {
  index: number
  addresses: {
    mainnet: string
    testnet: string
  }
  publicKey: string
}

export type Wallet = {
  privateKey: string
  createdAt: string

  accounts: Array<WalletAccount>
}
