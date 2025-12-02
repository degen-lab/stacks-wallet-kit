import { IBackupManager } from '../../../src'
import { BackupManager } from '../../../src/backup/manager/backupManager'
import {
  BackupAlreadyExistsError,
  BackupNotFoundError,
} from '../../../src/shared/errors/backupErrors'
import { mockBackupClient } from '../../__mocks__/backup/backup'

describe('Backup unit tests', () => {
  const backupManager: IBackupManager = new BackupManager(mockBackupClient)
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('should save the backup successfully', async () => {
    const name = 'test-backup'
    const mnemonic = 'test-mnemonic'
    const encryptedWallet = 'encrypted-wallet-string'
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([])
    await backupManager.saveBackup(name, {
      version: 1,
      mnemonic,
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
      wallet: encryptedWallet,
      accountsCount: 1,
      salt: 'test-salt',
    })
    expect(mockBackupClient.upload).toHaveBeenCalledWith(
      name,
      expect.objectContaining({
        version: 1,
        mnemonic,
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
      }),
      { walletName: 'Google-Wallet' }
    )
  })

  it('should throw an error if the backup already exists', async () => {
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([
      {
        id: 'test-backup-id',
        name: 'test-backup',
        appProperties: {
          walletName: 'Google-Wallet',
        },
      },
    ])
    await expect(
      backupManager.saveBackup('test-backup', {
        version: 1,
        mnemonic: 'test-mnemonic',
        wallet: 'encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonicNonce: 'test-mnemonic-nonce',
        accountsCount: 1,
        salt: 'test-salt',
        protection: {
          kdf: {
            name: 'pbkdf2',
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      })
    ).rejects.toThrow(BackupAlreadyExistsError)
  })

  it('should delete the backup successfully', async () => {
    const backupId = 'test-backup-id'
    jest.spyOn(mockBackupClient, 'findOne').mockResolvedValueOnce({
      id: backupId,
      name: 'test-backup',
      appProperties: {
        walletName: 'Google-Wallet',
      },
    })
    await backupManager.deleteBackup(backupId)
    expect(mockBackupClient.delete).toHaveBeenCalledWith(backupId)
  })

  it('should throw an error if the backup does not exists', async () => {
    jest.spyOn(mockBackupClient, 'findOne').mockResolvedValueOnce(null)
    await expect(backupManager.deleteBackup('test-backup-id')).rejects.toThrow(
      BackupNotFoundError
    )
  })

  it('should delete the existing wallet backup without password', async () => {
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([
      {
        id: 'test-backup-id',
        name: 'test-backup',
        appProperties: {
          walletName: 'Google-Wallet',
        },
      },
    ])
    await backupManager.deleteExistingBackup()
    expect(mockBackupClient.delete).toHaveBeenCalledWith('test-backup-id')
  })

  it('should throw an error if there is no existing wallet backup to delete', async () => {
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([])
    await expect(backupManager.deleteExistingBackup()).rejects.toThrow(
      BackupNotFoundError
    )
  })

  it('should get the backup successfully', async () => {
    const backupId = 'test-backup-id'
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([
      {
        id: backupId,
        name: 'test-backup',
        appProperties: {
          walletName: 'Google-Wallet',
        },
      },
    ])
    jest.spyOn(mockBackupClient, 'download').mockResolvedValueOnce({
      version: 1,
      createdAt: new Date(),
      mnemonic: 'test-mnemonic',
      mnemonicNonce: 'test-mnemonic-nonce',
      walletNonce: 'test-wallet-nonce',
      walletId: 'test-wallet-id',
      protection: {
        kdf: {
          name: 'pbkdf2',
          iterations: 1000,
          salt: 'test-salt',
        },
        wrappedMasterKey: 'test-wrapped-master-key',
        wrapNonce: 'test-wrap-nonce',
      },
      wallet: 'encrypted-wallet-string',
      accountsCount: 1,
      salt: 'test-salt',
    })
    const backup = await backupManager.retrieveBackup()
    expect(mockBackupClient.download).toHaveBeenCalledWith('test-backup-id')
    expect(backup).toEqual({
      version: 1,
      createdAt: expect.any(Date),
      mnemonic: 'test-mnemonic',
      wallet: 'encrypted-wallet-string',
      accountsCount: 1,
      salt: 'test-salt',
      walletId: 'test-wallet-id',
      mnemonicNonce: 'test-mnemonic-nonce',
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
    })
  })

  it('should throw an error if the backup does not exists', async () => {
    jest.spyOn(mockBackupClient, 'findAll').mockResolvedValueOnce([])
    await expect(backupManager.retrieveBackup()).rejects.toThrow(
      BackupNotFoundError
    )
  })
})
