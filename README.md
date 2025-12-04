# Stacks Wallet Kit

A monorepo containing platform-agnostic and platform-specific SDKs for building Stacks blockchain applications with Google authentication and wallet management.

## Architecture

This repository is organized as a monorepo using pnpm workspaces, containing three main packages:

```
stacks-wallet-kit/
├── packages/
│   ├── core/          # Platform-agnostic core package
│   ├── mobile/        # React Native/Expo SDK
│   └── extension/     # Browser extension SDK
```

### `@stacks-wallet-kit/core`

The platform-agnostic core package that provides shared functionality used by both mobile and web SDKs.

**Contains:**

- **Types**: `Wallet`, `WalletAccount`, `WalletEnvelope`, `NetworkType`, `StackingPool`
- **Interfaces**: `IStorageManager`, `IAuthentication`, `IStacksClient`, `ISDKFacade`, etc.
- **Clients**: `StacksClient`, `StackingClient`
- **Managers**: `WalletManager`, `EncryptionManager`, `BackupManager`
- **Base Client**: `BaseClient` - The foundation SDK implementation
- **Error Types**: All SDK error classes

**Purpose**: Provides the foundational building blocks that can be used independently or extended by platform-specific SDKs.

### `@stacks-wallet-kit/mobile`

React Native/Expo SDK for mobile applications.

**Contains:**

- **MobileClient**: Extends `BaseClient` with React Native-specific implementations
- **Google Authentication**: React Native Google Sign-In integration
- **Storage**: React Native storage implementations (SecureStore, Keychain)

**Purpose**: Provides a ready-to-use SDK for React Native/Expo applications with mobile-optimized storage and authentication.

### `@stacks-wallet-kit/extension`

Browser extension SDK for browser extensions.

**Contains:**

- **ExtensionClient**: Extends `BaseClient` with extension-specific implementations
- **Google Authentication**: Web Google Sign-In integration
- **Storage**: Browser storage implementations (Chrome Storage, LocalStorage)

**Purpose**: Provides a ready-to-use SDK for browser extensions with extension-optimized storage and authentication.

## Package Dependencies

```
core (platform-agnostic)
  ↑
  ├── mobile (uses core)
  └── extension (uses core)
```

Both `mobile` and `extension` packages depend on `core`, ensuring consistent behavior across platforms while allowing platform-specific optimizations.

## Getting Started

### For Mobile Apps

```bash
npm install @stacks-wallet-kit/mobile
```

See [packages/mobile/README.md](./packages/mobile/README.md) for documentation.

### For Browser Extensions

```bash
npm install @stacks-wallet-kit/extension
```

See [packages/extension/README.md](./packages/extension/README.md) for documentation.

### For Custom Implementations

```bash
npm install @stacks-wallet-kit/core
```

See [packages/core/README.md](./packages/core/README.md) for documentation.

## Prerequisites

`Node.js 22+`

`pnpm 10.18.0+`
