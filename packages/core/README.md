# @google-wallet-sdk/core

A platform-agnostic core package providing shared functionality, types, and interfaces for the Google Wallet SDK ecosystem. This package is used by both the mobile SDK (`@google-wallet-sdk/mobile`) and the browser extension SDK (`@google-wallet-sdk/extension`).

## Purpose

The core package provides the foundational building blocks for building Stacks blockchain applications with Google authentication and wallet management. It includes:

- **Interfaces** for implementing custom storage managers, authentication, and other components
- **Types** for wallets, accounts, network configurations, and more
- **Clients** for Stacks blockchain operations and stacking
- **Managers** for wallet, encryption, and backup operations
- **Error types** for consistent error handling across platforms

## Installation

```bash
npm install @google-wallet-sdk/core
# or
yarn add @google-wallet-sdk/core
# or
pnpm add @google-wallet-sdk/core
```

## Usage

### Types

#### `Wallet`

Represents a wallet with its private key and accounts.

```typescript
import { Wallet } from '@google-wallet-sdk/core'

const wallet: Wallet = {
  privateKey: 'xprv...',
  createdAt: '2024-01-01T00:00:00.000Z',
  accounts: [
    {
      index: 0,
      publicKey: '02...',
      addresses: {
        mainnet: 'SP...',
        testnet: 'ST...',
      },
    },
  ],
}
```

#### `WalletAccount`

Represents a single account within a wallet.

```typescript
import { WalletAccount } from '@google-wallet-sdk/core'

const account: WalletAccount = {
  index: 0,
  publicKey: '02...',
  addresses: {
    mainnet: 'SP...',
    testnet: 'ST...',
  },
}
```

#### `WalletEnvelope`

Encrypted wallet backup format for Google Drive.

```typescript
import { WalletEnvelope } from '@google-wallet-sdk/core'

const envelope: WalletEnvelope = {
  version: 1,
  walletId: 'uuid',
  createdAt: new Date(),
  mnemonic: 'encrypted...',
  mnemonicNonce: 'nonce...',
  wallet: 'encrypted...',
  walletNonce: 'nonce...',
  accountsCount: 1,
  salt: 'salt...',
  protection: {
    kdf: {
      name: 'pbkdf2',
      iterations: 100000,
      salt: 'salt...',
    },
    wrappedMasterKey: 'key...',
    wrapNonce: 'nonce...',
  },
}
```

#### `NetworkType`

Network type enumeration.

```typescript
import { NetworkType } from '@google-wallet-sdk/core'

const network: NetworkType = NetworkType.Mainnet
const testnet: NetworkType = NetworkType.Testnet
const devnet: NetworkType = NetworkType.Devnet
```

#### `StackingPool`

Stacking pool configuration.

```typescript
import { StackingPool } from '@google-wallet-sdk/core'

const pool: StackingPool = {
  name: 'Pool Name',
  address: 'SP...',
}
```

### Interfaces

#### `IStorageManager`

Interface for implementing custom storage managers.

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
```

#### `IAuthentication`

Interface for implementing custom authentication.

```typescript
import { IAuthentication } from '@google-wallet-sdk/core'

class CustomAuth implements IAuthentication {
  async signIn(): Promise<void> {
    // Your implementation
  }

  async signOut(): Promise<void> {
    // Your implementation
  }

  async getAccessToken(): Promise<string> {
    // Your implementation
  }

  async isSignedIn(): Promise<boolean> {
    // Your implementation
  }
}
```

#### `IStacksClient`

Interface for Stacks blockchain operations.

```typescript
import {
  IStacksClient,
  WalletAccount,
  NetworkType,
} from '@google-wallet-sdk/core'

class CustomStacksClient implements IStacksClient {
  async getBalance(account: WalletAccount): Promise<number> {
    // Your implementation
  }

  async sendStx(
    from: string,
    to: string,
    amount: number,
    network: NetworkType,
    memo?: string
  ): Promise<string> {
    // Your implementation
  }

  // ... other methods
}
```

#### `ISDKFacade`

Interface defining the complete SDK API surface.

```typescript
import { ISDKFacade } from '@google-wallet-sdk/core'

class CustomSDK implements ISDKFacade {
  async loginWithGoogle(): Promise<{
    accessToken: string
    hasBackup: boolean
  }> {
    // Your implementation
  }

  async createWallet(passphrase?: string): Promise<Wallet> {
    // Your implementation
  }

  // ... other methods
}
```

### Clients

#### `StacksClient`

Client for Stacks blockchain operations.

```typescript
import {
  StacksClient,
  NetworkType,
  STACKS_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  STACKS_DEVNET_API_BASE_URL,
} from '@google-wallet-sdk/core'

const client = new StacksClient(
  NetworkType.Testnet,
  STACKS_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  STACKS_DEVNET_API_BASE_URL
)

client.setNetwork(NetworkType.Devnet)
```

#### `StackingClient`

Client for Stacks stacking operations.

```typescript
import { StackingClient, NetworkType } from '@google-wallet-sdk/core'

const client = new StackingClient(NetworkType.Mainnet)
```

### Managers

#### `WalletManager`

Manager for wallet operations.

```typescript
import { WalletManager, Wallet } from '@google-wallet-sdk/core'

const manager = new WalletManager()
const wallet: Wallet = manager.createWallet()
const updatedWallet = manager.createAccount(wallet)
```

#### `EncryptionManager`

Manager for encryption operations.

```typescript
import { EncryptionManager } from '@google-wallet-sdk/core'

const manager = new EncryptionManager()
const encrypted = await manager.encrypt('data', 'password')
const decrypted = await manager.decrypt(encrypted, 'password')
```

#### `BackupManager`

Manager for backup operations.

```typescript
import { BackupManager, GoogleBackupClient } from '@google-wallet-sdk/core'

const backupClient = new GoogleBackupClient()
const manager = new BackupManager(backupClient)
```

### Constants

#### API Base URLs

```typescript
import {
  STACKS_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  STACKS_DEVNET_API_BASE_URL,
} from '@google-wallet-sdk/core'

const mainnetUrl = STACKS_API_BASE_URL
const testnetUrl = STACKS_TESTNET_API_BASE_URL
const devnetUrl = STACKS_DEVNET_API_BASE_URL
```

#### Stacking Pools

```typescript
import { stackingPools } from '@google-wallet-sdk/core'

const pools = stackingPools
```

### Error Types

```typescript
import {
  WalletNotStoredError,
  InvalidAmountError,
  MinimumThresholdNotMetError,
  AuthError,
  BackupError,
  StackingError,
} from '@google-wallet-sdk/core'

try {
  // Your code
} catch (error) {
  if (error instanceof WalletNotStoredError) {
    // Handle wallet not found
  } else if (error instanceof InvalidAmountError) {
    // Handle invalid amount
  }
}
```

## Examples

### Custom Storage Implementation

```typescript
import { IStorageManager } from '@google-wallet-sdk/core'

class LocalStorageManager implements IStorageManager {
  async setItem<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async getItem<T>(key: string): Promise<T | null> {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }
}
```

### Using Types

```typescript
import { Wallet, WalletAccount, NetworkType } from '@google-wallet-sdk/core'

function processWallet(wallet: Wallet): void {
  wallet.accounts.forEach((account: WalletAccount) => {
    // Process account
  })
}
```
