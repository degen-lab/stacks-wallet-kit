# stacks-wallet-kit/extension [![npm](https://img.shields.io/npm/v/@degenlab/stacks-wallet-kit-extension?color=red)](https://www.npmjs.com/package/@degenlab/stacks-wallet-kit-extension)

A Chrome extension SDK for building Stacks blockchain applications with Google authentication and wallet management.

## Purpose

This SDK enables seamless Web2 authentication for Chrome extensions and provides easy wallet backup to a safe place without requiring users to store or remember their mnemonic phrase. It simplifies blockchain operations by handling the complexity of parsing arguments and data, allowing developers to focus on building their applications rather than managing low-level blockchain interactions.

The extension SDK imports functionality from the `@degenlab/stacks-wallet-kit-core` package, which is platform-agnostic and shared between this extension SDK and the mobile SDK, ensuring consistency across platforms.

## Installation

```bash
npm install @degenlab/stacks-wallet-kit-extension
# or
yarn add @degenlab/stacks-wallet-kit-extension
# or
pnpm add @degenlab/stacks-wallet-kit-extension
```

**Note:** This package works with npm, yarn, and pnpm. Choose the package manager that fits your project.

## Required Polyfills and Setup

The SDK requires Node.js polyfills to work in the browser environment. The core SDK uses `Buffer` which is not available in browsers by default.

### Required Polyfill Package

Install the `buffer` package:

```bash
npm install buffer
# or
yarn add buffer
# or
pnpm add buffer
```

### Polyfill Setup

#### For Vite Projects

If you're using **Vite** (recommended for Chrome extensions), you need to:

1. **Configure Vite to resolve the buffer package** in your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  // ... rest of your config
})
```

2. **Import and set Buffer globally** in your entry point file (e.g., `src/playground.tsx`, `src/popup.ts`, or `src/background.ts`):

```typescript
// ⚠️ IMPORTANT: Buffer polyfill MUST be imported FIRST, before any SDK imports
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(globalThis as any).Buffer = Buffer
}

// Now import your SDK and other dependencies
import { WebClient, NetworkType } from '@degenlab/stacks-wallet-kit-extension'
// ... rest of your imports
```

**Important:** The Buffer polyfill must be imported and set globally **before** any SDK code runs. This is critical for the SDK to work correctly.

#### For Webpack Projects

If you're using **Webpack**, you need to:

1. **Install the buffer polyfill** (already covered above)

2. **Configure Webpack** in your `webpack.config.js`:

```javascript
const webpack = require('webpack')

module.exports = {
  resolve: {
    fallback: {
      buffer: require.resolve('buffer'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  // ... rest of your config
}
```

3. **Set Buffer globally** in your entry point (same as Vite setup above)

#### For Other Build Tools

For other build tools (Rollup, esbuild, etc.), ensure:

- The `buffer` package is installed
- Buffer is available globally before any SDK imports
- Your build tool can resolve the `buffer` module

### Chrome Extension Manifest Configuration

Your `manifest.json` needs the following permissions and configuration:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "identity", "activeTab", "tabs", "windows"],
  "host_permissions": ["*://*/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; frame-src https://accounts.google.com https://*.chromiumapp.org;"
  }
}
```

**Required permissions:**

- `storage` - Required for storing encrypted wallet data
- `identity` - Required for Google OAuth authentication
- `activeTab`, `tabs`, `windows` - Required for OAuth flow
- `host_permissions` - Required for API calls to Stacks networks

**Content Security Policy:**

- `'wasm-unsafe-eval'` - Required for cryptographic operations
- `frame-src` - Required for Google OAuth redirects

### Common Errors and Solutions

**Error: `ReferenceError: Buffer is not defined`**

- **Solution:** Ensure `buffer` package is installed and Buffer is imported and set globally **before** any SDK imports.

**Error: `Cannot find module 'buffer'`**

- **Solution:** Install the buffer package: `npm install buffer`
- For Vite: Ensure the buffer alias is configured in `vite.config.ts`
- For Webpack: Ensure the buffer fallback is configured in `webpack.config.js`

**Error: `Buffer is not a constructor`**

- **Solution:** Make sure Buffer is set on both `window` and `globalThis`:
  ```typescript
  ;(window as any).Buffer = Buffer
  ;(globalThis as any).Buffer = Buffer
  ```

**Troubleshooting Steps:**

1. Verify `buffer` package is installed: `npm list buffer`
2. Check that Buffer is imported **first** in your entry point
3. Verify Buffer is set globally before SDK imports
4. Clear your build cache and rebuild
5. Check browser console for specific error messages

## Quick Start

```typescript
import { WebClient, NetworkType } from '@degenlab/stacks-wallet-kit-extension'

const client = new WebClient(
  'your-google-client-id',
  'your-google-client-secret',
  'https://your-extension-id.chromiumapp.org/',
  NetworkType.Testnet,
  {
    // Optional: Additional OAuth scopes
    // scopes: ['email', 'profile'],
    // Optional: Custom storage manager
    // storageManager: customStorageManager,
    // Optional: Custom API URLs
    // mainnetUrl: 'https://api.hiro.so/',
    // testnetUrl: 'https://api.testnet.hiro.so/',
    // devnetUrl: 'http://localhost:3999/',
  }
)

// IMPORTANT: Set encryption password FIRST before any operations
await client.setEncryptionPassword('your-encryption-password')

const wallet = await client.createWallet() // Optional passphrase

const accounts = await client.getWalletAccounts()
const account = accounts[0]

const balance = await client.getBalance(account)
```

## ⚠️ Important: Password Setup

**You MUST call `setEncryptionPassword()` before performing any wallet operations.** This is required because:

1. The `StorageManager` uses encryption to securely store wallet data in Chrome's storage
2. Without setting the password, the storage manager cannot encrypt or decrypt data
3. The same password you use for `setEncryptionPassword()` must be used when creating Google Drive backups

### Password Flow

```typescript
// 1. Set encryption password first (required before any operations)
await client.setEncryptionPassword('my-secure-password')

// 2. Now you can perform wallet operations
const wallet = await client.createWallet()

// 3. When backing up to Google Drive, use the SAME password
await client.backupWallet('my-secure-password') // Must match encryption password
```

**Note:** After a Chrome extension refresh, the password is not stored in memory. You must call `setEncryptionPassword()` again to decrypt and access stored data.

## WebClient Configuration

### Constructor Parameters

```typescript
new WebClient(
  googleClientId: string,        // Required: Google OAuth client ID
  googleClientSecret: string,    // Required: Google OAuth client secret
  redirectUri: string,           // Required: OAuth redirect URI (e.g., 'https://your-extension-id.chromiumapp.org/')
  network: NetworkType,          // Required: Initial network (Mainnet, Testnet, or Devnet)
  configOptions?: {              // Optional: Configuration options
    scopes?: string[]            // Optional: Additional OAuth scopes
    storageManager?: IWebStorageManager  // Optional: Custom storage manager
    mainnetUrl?: string          // Optional: Custom mainnet API URL
    testnetUrl?: string          // Optional: Custom testnet API URL
    devnetUrl?: string           // Optional: Custom devnet API URL
  }
)
```

### Default Configuration

**Storage Manager:**

- If not provided, `WebClient` automatically uses `StorageManager` which stores encrypted data in Chrome's `chrome.storage.local` API

**OAuth Scopes:**

- Default scope: `https://www.googleapis.com/auth/drive.appdata` (required for Google Drive backup)
- Additional scopes can be provided via the `scopes` parameter and will be merged with the default scope

**Stacks API URLs:**

- **Mainnet**: `https://api.hiro.so/`
- **Testnet**: `https://api.testnet.hiro.so/`
- **Devnet**: `http://localhost:3999/`

### Internal Components

`WebClient` automatically initializes the following components:

- **Authentication**: `AuthenticationManager` with `GoogleSigninClient`
- **Backup Manager**: `BackupManager` with `GoogleBackupClient`
- **Wallet Manager**: `WalletManager` for wallet operations
- **Encryption Manager**: `EncryptionManager` for encryption/decryption
- **Stacks Client**: `StacksClient` with configured network and API URLs
- **Stacking Client**: `StackingClient` with configured network

## API Reference

### Password Management

#### `setEncryptionPassword(password: string)`

**⚠️ REQUIRED:** Set the encryption password for the storage manager. Must be called before any wallet operations.

```typescript
await client.setEncryptionPassword('your-encryption-password')
```

**Important Notes:**

- This must be called before any operations that read or write to storage
- The password is used to encrypt/decrypt all stored wallet data
- After extension refresh, you must call this again to access stored data
- Use the same password when calling `backupWallet()`

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

### Backup

#### `backupWallet(password: string)`

Backup the wallet to Google Drive. **The password must match the encryption password set with `setEncryptionPassword()`.**

```typescript
// First set encryption password
await client.setEncryptionPassword('my-password')

// Then backup using the SAME password
await client.backupWallet('my-password')
```

**Throws `InvalidPasswordError` if the password doesn't match the encryption password.**

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
  1, // extend by 1 cycle
  1000 // max amount in STX
) // Returns: string

// With custom signer options (skip backend signature generation)
const txid2: string = await client.stackExtend(account, 1, 1000, {
  signerSignature: '0x...', // Optional: custom signer signature
  signerKey: '0x...', // Optional: custom signer key
  authId: '123', // Optional: custom auth ID
}) // Returns: string
```

##### `stackIncrease(account, increaseBy, maxAmount, currentLockPeriod, options?)`

Increase the stacking amount.

**Note:** If `options` is not provided, the signature will be automatically generated by a backend service for mainnet and testnet networks.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

// Basic usage (signature generated by backend)
const txid: string = await client.stackIncrease(
  account,
  500, // increase by 500 STX
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

##### `delegateSTX(account, amount, poolAddress, untilBurnHeight)`

Delegate STX to a stacking pool.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.delegateSTX(
  account,
  1000, // amount to delegate in STX
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // pool address
  100000 // until burn height
) // Returns: string
```

##### `revokeDelegation(account, poolAddress)`

Revoke STX delegation from a stacking pool.

```typescript
const accounts: WalletAccount[] = await client.getWalletAccounts()
const account: WalletAccount = accounts[0]

const txid: string = await client.revokeDelegation(
  account,
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // pool address
) // Returns: string
```

### Network

#### `setNetwork(network: NetworkType)`

Change the active network.

```typescript
client.setNetwork(NetworkType.Mainnet)
client.setNetwork(NetworkType.Testnet)
client.setNetwork(NetworkType.Devnet)
```

## Custom Storage Manager

You can provide a custom storage manager that implements `IWebStorageManager` from `@degenlab/stacks-wallet-kit-core`:

```typescript
import { IWebStorageManager } from '@degenlab/stacks-wallet-kit-core'

class CustomStorageManager implements IWebStorageManager {
  async setPassword(password: string): Promise<void> {
    // Your implementation
  }

  async checkEncryptionPasswordMatches(password: string): Promise<boolean> {
    // Your implementation
  }

  // ... implement other IStorageManager methods
}

const customStorage = new CustomStorageManager()
const client = new WebClient(
  'client-id',
  'client-secret',
  'redirect-uri',
  NetworkType.Testnet,
  {
    storageManager: customStorage,
    // Optional: Additional configuration
    // scopes: ['email', 'profile'],
    // mainnetUrl: 'https://api.hiro.so/',
    // testnetUrl: 'https://api.testnet.hiro.so/',
    // devnetUrl: 'http://localhost:3999/',
  }
)
```

**Note:** Your custom storage manager must implement `IWebStorageManager` which includes `setPassword()` and `checkEncryptionPasswordMatches()` methods for password management.

## Prerequisites

- Node.js 22+
- Chrome extension development environment
- Google OAuth credentials (Client ID and Client Secret)
- Google Drive API access (for backup functionality)

## Types

All types are exported from `@degenlab/stacks-wallet-kit-core`. Common types include:

- `Wallet` - Wallet object containing mnemonic and accounts
- `WalletAccount` - Individual account in a wallet
- `NetworkType` - Network type enum (Mainnet, Testnet, Devnet)
- `InvalidPasswordError` - Error thrown when password validation fails
- `PasswordNotSetError` - Error thrown when password is not set

## Error Handling

The SDK throws specific error types for different scenarios:

- `InvalidPasswordError` - Thrown when password doesn't match during backup or validation
- `PasswordNotSetError` - Thrown when trying to access storage without setting password first
- `AuthError` - Thrown during authentication failures
- `WalletNotStoredError` - Thrown when wallet operations are attempted without a stored wallet
