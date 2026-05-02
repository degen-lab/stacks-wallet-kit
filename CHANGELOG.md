# Changelog

## 2.0.0

### Breaking Changes

- Replaced the Google-only auth API with provider-aware auth: use `signIn('google')` or `signIn('apple')` instead of `loginWithGoogle()`.
- Replaced single-provider backup methods with provider-aware backup methods:
  - `hasBackup(provider)`
  - `backupWallet(password, targets)`
  - `retrieveWalletFromProvider(password, provider)`
  - `deleteBackup(provider)`
- Deprecated the old Google-only facade methods. `loginWithGoogle()`, `retrieveWallet(password)`, `deleteBackupWithoutPassword()` are still available as backward-compatible wrappers, but new integrations should use the provider-aware APIs above.
- Changed auth return values to `AuthenticatedUser`, with provider identity and credentials under `user.credentials`.
- Changed `BackupManager` from a single Google client constructor model to provider registration with `registerProvider()`.

### Added

- Added provider-aware backup support for writing to one or more targets.
- Added Apple Sign-In support in the mobile package.
- Added iCloud CloudKit backup support in the mobile package, including the Expo module, podspec, and config plugin export.
- Added extension demo wiring for the new provider-aware Google auth and backup APIs.
- Added structured backup write results, including per-provider success and failure details.
