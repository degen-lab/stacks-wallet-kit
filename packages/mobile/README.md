# stacks-wallet-kit/mobile [![npm](https://img.shields.io/npm/v/@degenlab/stacks-wallet-kit-mobile?color=red)](https://www.npmjs.com/package/@degenlab/stacks-wallet-kit-mobile)

A React Native/Expo SDK for building Stacks blockchain applications with Google authentication and wallet management.

## Purpose

This SDK enables seamless Web2 authentication for mobile apps and provides easy wallet backup to a safe place without requiring users to store or remember their mnemonic phrase. It simplifies blockchain operations by handling the complexity of parsing arguments and data, allowing developers to focus on building their applications rather than managing low-level blockchain interactions.

The mobile SDK imports functionality from the `@degenlab/stacks-wallet-kit-core` package, which is platform-agnostic and shared between this mobile SDK and the web extension SDK, ensuring consistency across platforms.

## Installation

```bash
npm install @degenlab/stacks-wallet-kit-mobile
# or
yarn add @degenlab/stacks-wallet-kit-mobile
# or
pnpm add @degenlab/stacks-wallet-kit-mobile
```

**Note:** This package works with npm, yarn, and pnpm. Choose the package manager that fits your project.

## Required Polyfills and Setup

The SDK requires Node.js polyfills to work in React Native/Expo environments. These polyfills must be imported **before** any SDK code runs.

### Required Polyfill Packages

Install the following packages:

```bash
npm install react-native-get-random-values buffer
# For Expo projects:
npm install expo-standard-web-crypto
```

**Required packages:**

1. **`react-native-get-random-values`** - Provides `crypto.getRandomValues()` for cryptographic operations
2. **`buffer`** - Provides Node.js `Buffer` API
3. **`expo-standard-web-crypto`** (Expo only) - Provides Web Crypto API polyfill

### Polyfill Setup

#### For Expo Router Projects

If you're using **Expo Router**, add the polyfills at the very top of your root layout file (`app/_layout.tsx` or `app/_layout.js`):

```typescript
// app/_layout.tsx
// ⚠️ IMPORTANT: Polyfills MUST be imported FIRST, before any other imports
import 'react-native-get-random-values'
import 'expo-standard-web-crypto'
import { Buffer } from 'buffer'

// Make Buffer available globally for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

// Now import your other dependencies
import { Stack } from 'expo-router'
// ... rest of your imports
```

#### For React Native (Non-Expo) Projects

If you're using **React Native without Expo**, create an `index.js` file in your project root:

```javascript
// index.js
// ⚠️ IMPORTANT: Polyfills MUST be imported FIRST
import 'react-native-get-random-values'
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

// Now import your app entry point
import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

AppRegistry.registerComponent(appName, () => App)
```

Then update your `package.json`:

```json
{
  "main": "index.js"
}
```

#### For Expo (Non-Router) Projects

If you're using **Expo without Router**, add polyfills to your `App.js` or `App.tsx`:

```typescript
// App.tsx
// ⚠️ IMPORTANT: Polyfills MUST be imported FIRST
import 'react-native-get-random-values'
import 'expo-standard-web-crypto'
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

// Now import your app components
import { View, Text } from 'react-native'
// ... rest of your app
```

### Platform-Specific Configuration

#### Android Emulator

When testing on Android emulator, use `10.0.2.2` instead of `localhost` for devnet URLs:

```typescript
import { Platform } from 'react-native'

const getDevnetUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator - use 10.0.2.2 (maps to host's localhost)
    return 'http://10.0.2.2:3999/'
  } else if (Platform.OS === 'web') {
    // Web platform - use localhost
    return 'http://localhost:3999/'
  } else {
    // iOS - use localhost (iOS simulator maps localhost correctly)
    return 'http://localhost:3999/'
  }
}

const client = new MobileClient(
  'web-client-id',
  'ios-client-id',
  NetworkType.Devnet,
  {
    devnetUrl: getDevnetUrl(),
  }
)
```

#### Web Platform

When running on web (Expo web), the polyfills work the same way, but make sure to use `localhost` for devnet URLs instead of `10.0.2.2`.

### Common Errors and Solutions

**Error: `crypto.getRandomValues must be defined`**

- **Solution:** Make sure `react-native-get-random-values` is imported at the very top of your entry file, before any other imports.

**Error: `Property 'Buffer' doesn't exist`**

- **Solution:** Import `buffer` and set `global.Buffer = Buffer` before any SDK code runs.

**Error: `ReferenceError: Buffer is not defined`**

- **Solution:** Ensure the Buffer polyfill is set up correctly (see setup instructions above).

**Troubleshooting Steps:**

1. Verify polyfills are imported **first** in your entry file
2. Clear Metro bundler cache: `npx expo start --clear` or `npx react-native start --reset-cache`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
4. Restart your development server completely

## Quick Start

```typescript
import { MobileClient, NetworkType } from '@degenlab/stacks-wallet-kit-mobile'

const client = new MobileClient(
  'your-web-client-id',
  'your-ios-client-id',
  NetworkType.Testnet,
  {
    scopes: ['email', 'profile'],
    devnetUrl: 'http://10.0.2.2:3999',
  }
)

client.setNetwork(NetworkType.Devnet)

const wallet = await client.createWallet() // Optional passphrase

const accounts = await client.getWalletAccounts()
const account = accounts[0]

const balance = await client.getBalance(account)

// Sign a prepared Stacks transaction with a specific account
const signedTx = await client.signTransaction(
  account.index,
  unsignedTransaction // StacksTransactionWire
)

// Check if a wallet backup exists
const hasBackup = await client.hasBackup()
if (hasBackup) {
  console.log('Wallet backup exists')
}

// Make a contract call with custom fee
import { PostConditionMode, ClarityValue } from '@stacks/transactions'

const txId = await client.makeContractCall(
  'SP000000000000000000002Q6VF78.contract-name',
  'function-name',
  [/* functionArgs as ClarityValue[] */],
  PostConditionMode.Allow,
  5000 // optional custom fee in microSTX
)
```

## MobileClient Configuration

### Constructor Parameters

```typescript
new MobileClient(
  webClientId: string,        // Required: Google OAuth web client ID
  iosClientId: string,        // Required: Google OAuth iOS client ID
  network: NetworkType,       // Required: Initial network (Mainnet, Testnet, or Devnet)
  configOptions?: {           // Optional: Configuration options
    scopes?: string[]         // Optional: Additional OAuth scopes
    storageManager?: IStorageManager  // Optional: Custom storage manager
    mainnetUrl?: string       // Optional: Custom mainnet API URL
    testnetUrl?: string       // Optional: Custom testnet API URL
    devnetUrl?: string        // Optional: Custom devnet API URL
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
import { User } from '@degenlab/stacks-wallet-kit-core'

const result: {
  accessToken: string
  hasBackup: boolean
  userData: User | undefined
} = await client.loginWithGoogle()

// Access the returned values
console.log('Access Token:', result.accessToken)
console.log('Has Backup:', result.hasBackup)
console.log('User Data:', result.userData) // Contains Google user information
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

#### `removeWalletAccount(accountIndex: number)`

Remove an account from the wallet by its account index property.

```typescript
// Remove account where account.index === 1
await client.removeWalletAccount(1)

// Trying to remove the same index again will throw an error
// await client.removeWalletAccount(1) // ❌ Error: Account with index 1 not found

// Get updated accounts
const accounts: WalletAccount[] = await client.getWalletAccounts()
```

**Note:** 
- This removes the account by its `index` property, not by array position
- The deleted index is tracked and will be reused when creating new accounts
- Throws an error if no account with the specified index exists
- This permanently removes the account from the wallet stored in local storage

#### `getMnemonic()`

Retrieve the stored mnemonic phrase from secure storage.

```typescript
const mnemonic: string | null = await client.getMnemonic()

if (mnemonic) {
  console.log('Mnemonic:', mnemonic)
} else {
  console.log('No mnemonic found')
}
```

**Note:** Returns `null` if no mnemonic is stored. The mnemonic is securely stored when creating or storing a wallet.

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

#### `makeContractCall(contractAddress, functionName, functionArgs, postConditionMode?)`

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

// With default post condition mode (PostConditionMode.Deny)
const txid: string = await client.makeContractCall(
  contractAddress,
  functionName,
  functionArgs
) // Returns: string

// With custom post condition mode
const txid2: string = await client.makeContractCall(
  contractAddress,
  functionName,
  functionArgs,
  PostConditionMode.Allow // Optional: defaults to PostConditionMode.Deny
) // Returns: string
```

### Stacking

#### Solo Stacking

##### `stackSTX(account, amount, lockPeriod, maxAmount, options?)`

Stack STX to earn Bitcoin rewards.

**Note:** If `options` is not provided, the signature will be automatically generated by a backend service for mainnet and testnet networks.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

// Basic usage (signature generated by backend)
const txid: string = await client.stackSTX(
  account,
  1000, // amount to stack in STX
  1, // lock period in cycles
  1000 // max amount in STX
) // Returns: string

// With custom signer options (skip backend signature generation)
const txid2: string = await client.stackSTX(account, 1000, 1, 1000, {
  signerSignature: '0x...', // Optional: custom signer signature
  signerKey: '0x...', // Optional: custom signer key
  authId: '123', // Optional: custom auth ID
}) // Returns: string
```

##### `stackExtend(account, extendCount, maxAmount, options?)`

Extend the stacking lock period.

**Note:** If `options` is not provided, the signature will be automatically generated by a backend service for mainnet and testnet networks.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

// Basic usage (signature generated by backend)
const txid: string = await client.stackExtend(
  account,
  2, // number of cycles to extend
  1000 // max amount in STX
) // Returns: string

// With custom signer options (skip backend signature generation)
const txid2: string = await client.stackExtend(account, 2, 1000, {
  signerSignature: '0x...', // Optional: custom signer signature
  signerKey: '0x...', // Optional: custom signer key
  authId: '123', // Optional: custom auth ID
}) // Returns: string
```

##### `stackIncrease(account, increaseBy, maxAmount, currentLockPeriod, options?)`

Increase the amount being stacked.

**Note:** If `options` is not provided, the signature will be automatically generated by a backend service for mainnet and testnet networks.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

// Basic usage (signature generated by backend)
const txid: string = await client.stackIncrease(
  account,
  500, // amount to increase by in STX
  1500, // max amount in STX
  1 // current lock period
) // Returns: string

// With custom signer options (skip backend signature generation)
const txid2: string = await client.stackIncrease(account, 500, 1500, 1, {
  signerSignature: '0x...', // Optional: custom signer signature
  signerKey: '0x...', // Optional: custom signer key
  authId: '123', // Optional: custom auth ID
}) // Returns: string
```

#### Stacking with a Pool

##### `delegateSTX(account, amount, delegateTo, untilBurnHeight?)`

Delegate STX to a stacking pool.

```typescript
import { StackingPool } from '@degenlab/stacks-wallet-kit-core'

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
import { NetworkType } from '@degenlab/stacks-wallet-kit-mobile'

client.setNetwork(NetworkType.Mainnet)
client.setNetwork(NetworkType.Testnet)
client.setNetwork(NetworkType.Devnet)
```

## Configuration

### Platform-Specific Devnet URLs

See the [Platform-Specific Configuration](#platform-specific-configuration) section above for details on setting up devnet URLs for different platforms (Android emulator, iOS simulator, Web).

### Custom Storage Manager

You can provide a custom storage manager by implementing the `IStorageManager` interface from the `@degenlab/stacks-wallet-kit-core` package. Make sure to install the core package:

```bash
npm install @degenlab/stacks-wallet-kit-core
# or
yarn add @degenlab/stacks-wallet-kit-core
# or
pnpm add @degenlab/stacks-wallet-kit-core
```

```typescript
import { IStorageManager } from '@degenlab/stacks-wallet-kit-core'

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
  {
    storageManager: new CustomStorage(),
  }
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
import { MobileClient, NetworkType } from '@degenlab/stacks-wallet-kit-mobile'
import { Wallet, WalletAccount, User } from '@degenlab/stacks-wallet-kit-core'

async function walletFlow(): Promise<void> {
  const client: MobileClient = new MobileClient(
    'web-client-id',
    'ios-client-id',
    NetworkType.Devnet,
    { devnetUrl: 'http://10.0.2.2:3999' }
  )

  const {
    hasBackup,
    userData,
  }: {
    accessToken: string
    hasBackup: boolean
    userData: User | undefined
  } = await client.loginWithGoogle()

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
import { MobileClient, NetworkType } from '@degenlab/stacks-wallet-kit-mobile'
import { WalletAccount } from '@degenlab/stacks-wallet-kit-core'

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
import { MobileClient, NetworkType } from '@degenlab/stacks-wallet-kit-mobile'
import {
  uintCV,
  standardPrincipalCV,
  ClarityValue,
  PostConditionMode,
} from '@stacks/transactions'

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

  // With optional post condition mode
  const txid: string = await client.makeContractCall(
    contractAddress,
    functionName,
    functionArgs,
    PostConditionMode.Allow
  )
}
```
