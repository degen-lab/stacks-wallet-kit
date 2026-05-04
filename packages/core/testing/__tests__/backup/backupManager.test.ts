import { IBackupProvider, WalletEnvelope } from '../../../src'
import { BackupManager } from '../../../src/backup/manager/backupManager'
import {
  BackupProviderNotRegisteredError,
  BackupWriteFailedError,
} from '../../../src/shared/errors/backupErrors'

const envelope: WalletEnvelope = {
  version: 1,
  mnemonic: 'test-mnemonic',
  walletNonce: 'test-wallet-nonce',
  protection: {
    kdf: {
      name: 'pbkdf2',
      iterations: 1000,
      salt: 'test-salt',
    },
    wrappedMasterKey: 'test-wrapped-master-key',
    wrapNonce: 'test-wrap-nonce',
  },
  walletId: 'test-wallet-id',
  createdAt: new Date(),
  mnemonicNonce: 'test-mnemonic-nonce',
  wallet: 'encrypted-wallet-string',
  accountsCount: 1,
  salt: 'test-salt',
}

function createProvider(
  provider: 'google' | 'apple',
  available = true
): IBackupProvider {
  return {
    provider,
    isAvailable: jest.fn(async () => available),
    hasBackup: jest.fn(async () => true),
    save: jest.fn(async () => undefined),
    retrieve: jest.fn(async () => envelope),
    delete: jest.fn(async () => undefined),
  }
}

describe('BackupManager unit tests', () => {
  let backupManager: BackupManager
  let googleProvider: IBackupProvider
  let appleProvider: IBackupProvider

  beforeEach(() => {
    backupManager = new BackupManager()
    googleProvider = createProvider('google')
    appleProvider = createProvider('apple')
    jest.clearAllMocks()
  })

  it('should register and return a backup provider', () => {
    backupManager.registerProvider(googleProvider)

    expect(backupManager.getProvider('google')).toBe(googleProvider)
  })

  it('should list available backup providers', async () => {
    appleProvider = createProvider('apple', false)
    backupManager.registerProvider(googleProvider)
    backupManager.registerProvider(appleProvider)

    await expect(backupManager.listAvailable()).resolves.toEqual(['google'])
  })

  it('should delegate hasBackup to the selected provider', async () => {
    backupManager.registerProvider(googleProvider)

    await expect(backupManager.hasBackup('google')).resolves.toBe(true)
    expect(googleProvider.hasBackup).toHaveBeenCalled()
  })

  it('should save to all selected targets', async () => {
    backupManager.registerProvider(googleProvider)
    backupManager.registerProvider(appleProvider)

    await expect(
      backupManager.saveToTargets(envelope, ['google', 'apple'])
    ).resolves.toEqual({
      succeeded: ['google', 'apple'],
      failed: [],
    })
    expect(googleProvider.save).toHaveBeenCalledWith(envelope)
    expect(appleProvider.save).toHaveBeenCalledWith(envelope)
  })

  it('should return partial failures when at least one target succeeds', async () => {
    const error = new Error('Cloud write failed')
    appleProvider.save = jest.fn(async () => {
      throw error
    })
    backupManager.registerProvider(googleProvider)
    backupManager.registerProvider(appleProvider)

    await expect(
      backupManager.saveToTargets(envelope, ['google', 'apple'])
    ).resolves.toEqual({
      succeeded: ['google'],
      failed: [{ provider: 'apple', error }],
    })
  })

  it('should throw when all selected targets fail', async () => {
    googleProvider.save = jest.fn(async () => {
      throw new Error('Google write failed')
    })
    backupManager.registerProvider(googleProvider)

    await expect(
      backupManager.saveToTargets(envelope, ['google'])
    ).rejects.toThrow(BackupWriteFailedError)
  })

  it('should retrieve from the selected provider', async () => {
    backupManager.registerProvider(googleProvider)

    await expect(backupManager.retrieveFrom('google')).resolves.toEqual(
      envelope
    )
    expect(googleProvider.retrieve).toHaveBeenCalled()
  })

  it('should delete from the selected provider', async () => {
    backupManager.registerProvider(googleProvider)

    await backupManager.deleteFrom('google')

    expect(googleProvider.delete).toHaveBeenCalled()
  })

  it('should throw if the selected provider is not registered', async () => {
    await expect(backupManager.hasBackup('google')).rejects.toThrow(
      BackupProviderNotRegisteredError
    )
    await expect(backupManager.retrieveFrom('google')).rejects.toThrow(
      BackupProviderNotRegisteredError
    )
    await expect(backupManager.deleteFrom('google')).rejects.toThrow(
      BackupProviderNotRegisteredError
    )
  })
})
