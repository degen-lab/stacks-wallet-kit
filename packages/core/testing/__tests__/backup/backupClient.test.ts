import { GoogleBackupClient } from '../../../src/backup/client/googleBackupClient'
import * as googleApiRequestModule from '../../../src/backup/utils/googleApiRequest'
import {
  AccessTokenError,
  GoogleApiError,
} from '../../../src/shared/errors/backupErrors'
jest.mock('../../../src/backup/utils/googleApiRequest', () => {
  const actual = jest.requireActual(
    '../../../src/backup/utils/googleApiRequest'
  )
  return {
    ...actual,
    googleApiRequest: jest.fn(),
  }
})

globalThis.fetch = jest.fn()

describe('GoogleBackupClient unit tests', () => {
  const backupClient = new GoogleBackupClient('mock-access-token')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upload the backup successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce(true)
    await backupClient.upload('test-backup', {
      wallet: 'encrypted-wallet-string',
      mnemonic: 'test-mnemonic',
      accountsCount: 1,
      salt: 'test-salt',
      walletId: 'test-wallet-id',
      createdAt: new Date(),
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
      version: 1,
    })
    expect(googleApiRequestModule.googleApiRequest).toHaveBeenCalledWith(
      'https://www.googleapis.com/upload/drive/v3',
      'files',
      expect.objectContaining({
        method: 'POST',
        token: 'mock-access-token',
        query: { uploadType: 'multipart' },
        headers: expect.objectContaining({
          'Content-Type': expect.stringContaining(
            'multipart/related; boundary='
          ),
        }),
        body: expect.stringContaining('test-backup'),
      })
    )
  })

  it('should throw an error if the access token is invalid on upload', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new AccessTokenError())
    await expect(
      backupClient.upload('test-backup', {
        version: 1,
        createdAt: new Date(),
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
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'encrypted-wallet-string',
        accountsCount: 1,
        salt: 'test-salt',
      })
    ).rejects.toThrow(AccessTokenError)
  })
  it('should throw an error if the upload fails', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new Error('Upload failed'))
    await expect(
      backupClient.upload('test-backup', {
        version: 1,
        createdAt: new Date(),
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
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'encrypted-wallet-string',
        accountsCount: 1,
        salt: 'test-salt',
      })
    ).rejects.toThrow(GoogleApiError)
  })

  it('should find one backup successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'test-backup',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
    const backup = await backupClient.findOne('test-backup')
    expect(googleApiRequestModule.googleApiRequest).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3',
      'files',
      expect.objectContaining({
        token: 'mock-access-token',
        query: {
          spaces: 'appDataFolder',
          q: "name='test-backup'",
          fields: 'files(id, name, appProperties, properties)',
        },
      })
    )
    expect(backup).toEqual({
      id: 'test-backup-id',
      name: 'test-backup',
      appProperties: {
        walletName: 'Google-Wallet',
      },
    })
  })

  it('should throw an error if the token is invalid on find one', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new AccessTokenError())
    await expect(backupClient.findOne('test-backup')).rejects.toThrow(
      AccessTokenError
    )
  })

  it('should return null if the backup is not found', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: null,
      })
    const backup = await backupClient.findOne('missing-backup-id')
    expect(backup).toBeNull()
  })

  it('should throw an error if the find one fails', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new Error('Find one failed'))
    await expect(backupClient.findOne('test-backup')).rejects.toThrow(
      GoogleApiError
    )
  })
  it('should find all backups successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'test-backup',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
    const backups = await backupClient.findAll()
    expect(backups).toEqual([
      {
        id: 'test-backup-id',
        name: 'test-backup',
        appProperties: {
          walletName: 'Google-Wallet',
        },
      },
    ])
  })

  it('should throw an error if the token is invalid on find all', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new AccessTokenError())
    await expect(backupClient.findAll()).rejects.toThrow(AccessTokenError)
  })

  it('should throw an error if the find all fails', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new Error('Find all failed'))
    await expect(backupClient.findAll()).rejects.toThrow(GoogleApiError)
  })

  it('should delete a backup successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce(true)
    await backupClient.delete('test-backup-id')
    expect(googleApiRequestModule.googleApiRequest).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3',
      'files/test-backup-id',
      expect.objectContaining({
        method: 'DELETE',
        token: 'mock-access-token',
      })
    )
  })

  it('should throw an error if the token is invalid on delete', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new AccessTokenError())
    await expect(backupClient.delete('test-backup-id')).rejects.toThrow(
      AccessTokenError
    )
  })

  it('should throw an error if the delete fails', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new Error('Delete failed'))
    await expect(backupClient.delete('test-backup-id')).rejects.toThrow(
      GoogleApiError
    )
  })

  it('should download a backup successfully', async () => {
    ;(globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        wallet: {
          mnemonic: 'test-mnemonic',
          privateKey: 'test-private-key',
        },
      }),
    })
    const result = await backupClient.download('test-backup-id')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/test-backup-id?alt=media',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock-access-token',
        },
      })
    )
    expect(result).toEqual({
      wallet: {
        mnemonic: 'test-mnemonic',
        privateKey: 'test-private-key',
      },
    })
  })

  it('should throw an error if the token is invalid on download', async () => {
    ;(globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
    })
    await expect(backupClient.download('test-backup-id')).rejects.toThrow(
      AccessTokenError
    )
  })

  it('should throw an error if the download fails', async () => {
    ;(globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Internal Server Error' }),
    })
    await expect(backupClient.download('test-backup-id')).rejects.toThrow(
      GoogleApiError
    )
  })
})
