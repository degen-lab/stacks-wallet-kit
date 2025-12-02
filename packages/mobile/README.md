# @google-wallet-sdk/mobile

A React Native/Expo SDK for building Stacks blockchain applications with Google authentication and wallet management.

## Purpose

This SDK enables seamless Web2 authentication for mobile apps and provides easy wallet backup to a safe place without requiring users to store or remember their mnemonic phrase. It simplifies blockchain operations by handling the complexity of parsing arguments and data, allowing developers to focus on building their applications rather than managing low-level blockchain interactions.

The mobile SDK imports functionality from the `@google-wallet-sdk/core` package, which is platform-agnostic and shared between this mobile SDK and the web extension SDK, ensuring consistency across platforms.

## Installation

```bash
npm install @google-wallet-sdk/mobile
# or
yarn add @google-wallet-sdk/mobile
# or
pnpm add @google-wallet-sdk/mobile
```

## Quick Start

```typescript
import { MobileClient, NetworkType } from '@google-wallet-sdk/mobile'

const client = new MobileClient(
  'your-web-client-id',
  'your-ios-client-id',
  NetworkType.Testnet,
  ['email', 'profile'],
  undefined,
  {
    devnetUrl: 'http://10.0.2.2:3999',
  }
)

client.setNetwork(NetworkType.Devnet)

const wallet = await client.createWallet() // Optional passphrase

const accounts = await client.getWalletAccounts()
const account = accounts[0]

const balance = await client.getBalance(account)
```

## MobileClient Configuration

### Constructor Parameters

```typescript
new MobileClient(
  webClientId: string,        // Required: Google OAuth web client ID
  iosClientId: string,        // Required: Google OAuth iOS client ID
  network: NetworkType,       // Required: Initial network (Mainnet, Testnet, or Devnet)
  scopes?: string[],          // Optional: Additional OAuth scopes
  storageManager?: IStorageManager,  // Optional: Custom storage manager
  stacksConfig?: {            // Optional: Custom Stacks API URLs
    mainnetUrl?: string
    testnetUrl?: string
    devnetUrl?: string
  }
)
```

### Default Configuration

**Storage Manager:**

- If not provided, `MobileClient` automatically selects a storage implementation:
  - **Expo**: Uses `SecureStore` (Expo SecureStore)
  - **React Native**: Uses `KeyChainStorage` (react-native-keychain)

**OAuth Scopes:**

- Default scope: `https://www.googleapis.com/auth/drive.appdata` (required for Google Drive backup)
- Additional scopes can be provided via the `scopes` parameter and will be merged with the default scope

**Stacks API URLs:**

- **Mainnet**: `https://api.hiro.so/`
- **Testnet**: `https://api.testnet.hiro.so/`
- **Devnet**: `http://10.0.2.2:3999/` (Android emulator compatible)

**Google Sign-In Configuration:**

- `offlineAccess: true` - Enables refresh token support
- `forceCodeForRefreshToken: true` - Forces code exchange for refresh tokens

### Internal Components

`MobileClient` automatically initializes the following components:

- **Authentication**: `GoogleAuth` with provided client IDs and scopes
- **Backup Manager**: `BackupManager` with `GoogleBackupClient`
- **Wallet Manager**: `WalletManager` for wallet operations
- **Encryption Manager**: `EncryptionManager` for encryption/decryption
- **Stacks Client**: `StacksClient` with configured network and API URLs
- **Stacking Client**: `StackingClient` with configured network

## API Reference

### Authentication

#### `loginWithGoogle()`

Sign in with Google and check if a wallet backup exists.

```typescript
const result: { accessToken: string; hasBackup: boolean } =
  await client.loginWithGoogle()
```

#### `signOut()`

Sign out from Google authentication.

```typescript
await client.signOut()
```

### Wallet

#### `createWallet(passphrase?: string)`

Create a new wallet with a generated mnemonic.

```typescript
const wallet: Wallet = await client.createWallet() // Optional passphrase
```

#### `storeExistingWallet(mnemonic: string, passphrase?: string)`

Store an existing wallet from a mnemonic phrase.

```typescript
const mnemonic: string = 'abandon abandon abandon ...'
const wallet: Wallet = await client.storeExistingWallet(mnemonic) // Optional passphrase
```

#### `getWalletAccounts()`

Get all accounts in the wallet.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
```

#### `createAccount()`

Create a new account in the wallet.

```typescript
const newAccount: WalletAccount = await client.createAccount()
```

### Backup

#### `backupWallet(password: string)`

Backup the wallet to Google Drive.

```typescript
await client.backupWallet('wallet-password')
```

#### `retrieveWallet(password: string)`

Retrieve a wallet from Google Drive backup.

```typescript
const { wallet, mnemonic }: { wallet: Wallet; mnemonic: string } =
  await client.retrieveWallet('wallet-password')
```

#### `deleteBackup(password: string)`

Delete the wallet backup from Google Drive.

```typescript
await client.deleteBackup('wallet-password')
```

#### `deleteBackupWithoutPassword()`

Delete the wallet backup without requiring a password.

```typescript
await client.deleteBackupWithoutPassword()
```

### Stacks

#### `getBalance(account)`

Get the STX balance for an account.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]
const balance: number = await client.getBalance(account) // Returns: number
```

#### `sendStx(accountIndex, to, amount, network, memo?)`

Send STX tokens to another address.

```typescript
const txid: string = await client.sendStx(
  0, // account index
  'ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54', // recipient
  0.002, // amount in STX
  NetworkType.Devnet, // network
  'Test memo' // optional memo
) // Returns: string
```

#### `transferNFT(accountIndex, contractId, tokenId, to, network)`

Transfer an NFT to another address. Designed for SIP-9 NFT trait compliant contracts.

```typescript
const txid: string = await client.transferNFT(
  0, // account index
  'STJK0PY5JPPNR4PZWR7HVS7T92B1MKHQKBT5Q6MX.nft-test', // contract ID
  '2', // token ID
  'ST10WDE40SQ62CSWRE99NA0KWBZ74NNK4FNS9T19Q', // recipient
  NetworkType.Devnet // network
) // Returns: string
```

#### `transferFT(accountIndex, contractId, amount, to, network)`

Transfer fungible tokens to another address. Designed for SIP-10 FT trait compliant contracts.

```typescript
const txid: string = await client.transferFT(
  0, // account index
  'STJK0PY5JPPNR4PZWR7HVS7T92B1MKHQKBT5Q6MX.ft-test', // contract ID
  100 * 1000000, // amount in micro-units (100 tokens with 6 decimals)
  'ST10WDE40SQ62CSWRE99NA0KWBZ74NNK4FNS9T19Q', // recipient
  NetworkType.Devnet // network
) // Returns: string
```

#### `makeContractCall(contractAddress, functionName, functionArgs)`

Make a contract call to any Stacks smart contract.

```typescript
import {
  uintCV,
  standardPrincipalCV,
  PostConditionMode,
  ClarityValue,
} from '@stacks/transactions'

const contractAddress: string =
  'STJK0PY5JPPNR4PZWR7HVS7T92B1MKHQKBT5Q6MX.nft-test'
const functionName: string = 'transfer'
const functionArgs: ClarityValue[] = [
  uintCV('2'), // token-id
  standardPrincipalCV(senderAddress), // sender
  standardPrincipalCV(recipientAddress), // recipient
]

const txid: string = await client.makeContractCall(
  contractAddress,
  functionName,
  functionArgs
) // Returns: string
```

### Stacking

#### Solo Stacking

##### `stackSTX(account, amount, lockPeriod, maxAmount)`

Stack STX to earn Bitcoin rewards.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.stackSTX(
  account,
  1000, // amount to stack in STX
  1, // lock period in cycles
  1000 // max amount in STX
) // Returns: string
```

##### `stackExtend(account, extendCount, maxAmount)`

Extend the stacking lock period.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.stackExtend(
  account,
  2, // number of cycles to extend
  1000 // max amount in STX
) // Returns: string
```

##### `stackIncrease(account, increaseBy, maxAmount, currentLockPeriod)`

Increase the amount being stacked.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.stackIncrease(
  account,
  500, // amount to increase by in STX
  1500, // max amount in STX
  1 // current lock period
) // Returns: string
```

#### Stacking with a Pool

##### `delegateSTX(account, amount, delegateTo, untilBurnHeight?)`

Delegate STX to a stacking pool.

```typescript
import { StackingPool } from '@google-wallet-sdk/core'

const pool: StackingPool = {
  name: 'Pool Name',
  address: 'SP...',
}

const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.delegateSTX(
  account,
  1000, // amount to delegate in STX
  pool, // stacking pool
  100000 // optional: until burn height
) // Returns: string
```

##### `revokeDelegation(account)`

Revoke STX delegation from a stacking pool.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.revokeDelegation(account) // Returns: string
```

### Network

#### `setNetwork(network)`

Set the network for all operations.

```typescript
import { NetworkType } from '@google-wallet-sdk/mobile'

client.setNetwork(NetworkType.Mainnet)
client.setNetwork(NetworkType.Testnet)
client.setNetwork(NetworkType.Devnet)
```

## Configuration

### Android Emulator Setup

When testing on Android emulator, use `10.0.2.2` instead of `localhost` for devnet URLs:

```typescript
const client: MobileClient = new MobileClient(
  'web-client-id',
  'ios-client-id',
  NetworkType.Devnet,
  undefined,
  undefined,
  {
    devnetUrl: 'http://10.0.2.2:3999', // Android emulator host
  }
)
```

### Custom Storage Manager

You can provide a custom storage manager by implementing the `IStorageManager` interface from the `@google-wallet-sdk/core` package. Make sure to install the core package:

```bash
npm install @google-wallet-sdk/core
```

```typescript
import { IStorageManager } from '@google-wallet-sdk/core'

class CustomStorage implements IStorageManager {
  async setItem<T>(key: string, value: T): Promise<void> {
    // Your implementation
  }

  async getItem<T>(key: string): Promise<T | null> {
    // Your implementation
  }

  async removeItem(key: string): Promise<void> {
    // Your implementation
  }

  async clear(): Promise<void> {
    // Your implementation
  }
}

const client = new MobileClient(
  'web-client-id',
  'ios-client-id',
  NetworkType.Testnet,
  undefined,
  new CustomStorage()
)
```

## Types

### NetworkType

```typescript
enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Devnet = 'devnet',
}
```

### WalletAccount

```typescript
interface WalletAccount {
  index: number
  publicKey: string
  addresses: {
    mainnet: string
    testnet: string
  }
}
```

### StackingPool

```typescript
interface StackingPool {
  name: string
  address: string
}
```

## Examples

### Complete Wallet Flow

```typescript
import { MobileClient, NetworkType } from '@google-wallet-sdk/mobile'
import { Wallet, WalletAccount } from '@google-wallet-sdk/core'

async function walletFlow(): Promise<void> {
  const client: MobileClient = new MobileClient(
    'web-client-id',
    'ios-client-id',
    NetworkType.Devnet,
    undefined,
    undefined,
    { devnetUrl: 'http://10.0.2.2:3999' }
  )

  const { hasBackup }: { accessToken: string; hasBackup: boolean } =
    await client.loginWithGoogle()

  let wallet: Wallet
  if (hasBackup) {
    const result: { wallet: Wallet; mnemonic: string } =
      await client.retrieveWallet('password')
    wallet = result.wallet
  } else {
    wallet = await client.createWallet() // Optional passphrase
    await client.backupWallet('password')
  }

  const accounts: WalletAccount[] = await client.getWalletAccounts()
  const account: WalletAccount = accounts[0]

  const balance: number = await client.getBalance(account)
  if (balance > 0.01) {
    const txid: string = await client.sendStx(
      0,
      'ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54',
      0.01,
      NetworkType.Devnet,
      'Test payment'
    )
  }
}
```

### NFT Transfer Example

```typescript
import { MobileClient, NetworkType } from '@google-wallet-sdk/mobile'
import { WalletAccount } from '@google-wallet-sdk/core'

async function transferNFT(): Promise<void> {
  const client: MobileClient = new MobileClient(
    'web-client-id',
    'ios-client-id',
    NetworkType.Devnet
  )

  const accounts: WalletAccount[] = await client.getWalletAccounts()
  const account: WalletAccount = accounts[0]

  const txid: string = await client.transferNFT(
    account.index,
    'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-nft',
    '1',
    'ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54',
    NetworkType.Devnet
  )
}
```

### Custom Contract Call Example

```typescript
import { MobileClient, NetworkType } from '@google-wallet-sdk/mobile'
import { uintCV, standardPrincipalCV, ClarityValue } from '@stacks/transactions'

async function customContractCall(): Promise<void> {
  const client: MobileClient = new MobileClient(
    'web-client-id',
    'ios-client-id',
    NetworkType.Devnet
  )

  const contractAddress: string =
    'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-contract'
  const functionName: string = 'my-function'
  const functionArgs: ClarityValue[] = [
    uintCV(100),
    standardPrincipalCV('ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54'),
  ]

  const txid: string = await client.makeContractCall(
    contractAddress,
    functionName,
    functionArgs
  )
}
```
