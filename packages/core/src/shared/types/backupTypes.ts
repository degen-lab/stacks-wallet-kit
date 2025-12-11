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

export type User = {
  user: {
    id: string
    name: string | null
    email: string
    photo: string | null
    familyName: string | null
    givenName: string | null
  }
  scopes: string[]
  /**
   * JWT (JSON Web Token) that serves as a secure credential for your user's identity.
   */
  idToken: string | null
  /**
   * Not null only if a valid webClientId and offlineAccess: true was
   * specified in configure().
   */
  serverAuthCode: string | null
}
