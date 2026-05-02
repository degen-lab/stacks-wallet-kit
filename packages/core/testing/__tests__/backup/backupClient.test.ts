import { GoogleBackupClient } from '../../../src/backup/client/googleBackupClient'
import * as googleApiRequestModule from '../../../src/backup/utils/googleApiRequest'
import { WalletEnvelope } from '../../../src/shared'
import {
  AccessTokenError,
  BackupNotFoundError,
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

const envelope: WalletEnvelope = {
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
}

describe('GoogleBackupClient unit tests', () => {
  let backupClient: GoogleBackupClient

  beforeEach(() => {
    backupClient = new GoogleBackupClient('mock-access-token')
    jest.clearAllMocks()
  })

  it('should report availability from the access token', async () => {
    await expect(backupClient.isAvailable()).resolves.toBe(true)
    backupClient.setAccessToken('')
    await expect(backupClient.isAvailable()).resolves.toBe(false)
  })

  it('should create a backup when no existing wallet backup is found', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({ files: [] })
      .mockResolvedValueOnce(true)

    await backupClient.save(envelope)

    expect(googleApiRequestModule.googleApiRequest).toHaveBeenNthCalledWith(
      1,
      'https://www.googleapis.com/drive/v3',
      'files',
      expect.objectContaining({
        token: 'mock-access-token',
        query: {
          spaces: 'appDataFolder',
          fields: 'files(id, name, appProperties, properties)',
        },
      })
    )
    expect(googleApiRequestModule.googleApiRequest).toHaveBeenNthCalledWith(
      2,
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
        body: expect.stringContaining('"walletName":"Google-Wallet"'),
      })
    )
    expect(googleApiRequestModule.googleApiRequest).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"backupKind":"stacks-wallet-kit"'),
      })
    )
  })

  it('should update an existing backup found by the old walletName metadata', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'Google-Wallet',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
      .mockResolvedValueOnce(true)

    await backupClient.save(envelope)

    expect(googleApiRequestModule.googleApiRequest).toHaveBeenNthCalledWith(
      2,
      'https://www.googleapis.com/upload/drive/v3',
      'files/test-backup-id',
      expect.objectContaining({
        method: 'PATCH',
        token: 'mock-access-token',
        query: { uploadType: 'multipart' },
        body: expect.stringContaining('"walletName":"Google-Wallet"'),
      })
    )
  })

  it('should detect a backup found by backupKind metadata', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'Google-Wallet',
            appProperties: {
              backupKind: 'stacks-wallet-kit',
            },
          },
        ],
      })

    await expect(backupClient.hasBackup()).resolves.toBe(true)
  })

  it('should ignore unrelated appDataFolder files', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'other-file-id',
            name: 'Other',
            appProperties: {
              walletName: 'Other-Wallet',
            },
          },
        ],
      })

    await expect(backupClient.hasBackup()).resolves.toBe(false)
  })

  it('should throw an access token error when listing fails with auth error', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockRejectedValueOnce(new AccessTokenError())

    await expect(backupClient.hasBackup()).rejects.toThrow(AccessTokenError)
  })

  it('should throw a Google API error when save upload fails', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({ files: [] })
      .mockRejectedValueOnce(new Error('Upload failed'))

    await expect(backupClient.save(envelope)).rejects.toThrow(GoogleApiError)
  })

  it('should retrieve a backup successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'Google-Wallet',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
    ;(globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(envelope),
    })

    const result = await backupClient.retrieve()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/test-backup-id?alt=media',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock-access-token',
        },
      })
    )
    expect(result).toEqual(envelope)
  })

  it('should throw not found when retrieving without a matching backup', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({ files: [] })

    await expect(backupClient.retrieve()).rejects.toThrow(BackupNotFoundError)
  })

  it('should throw an access token error when download is unauthorized', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'Google-Wallet',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
    ;(globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(backupClient.retrieve()).rejects.toThrow(AccessTokenError)
  })

  it('should delete a backup successfully', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({
        files: [
          {
            id: 'test-backup-id',
            name: 'Google-Wallet',
            appProperties: {
              walletName: 'Google-Wallet',
            },
          },
        ],
      })
      .mockResolvedValueOnce(true)

    await backupClient.delete()

    expect(googleApiRequestModule.googleApiRequest).toHaveBeenNthCalledWith(
      2,
      'https://www.googleapis.com/drive/v3',
      'files/test-backup-id',
      expect.objectContaining({
        method: 'DELETE',
        token: 'mock-access-token',
      })
    )
  })

  it('should throw not found when deleting without a matching backup', async () => {
    jest
      .spyOn(googleApiRequestModule, 'googleApiRequest')
      .mockResolvedValueOnce({ files: [] })

    await expect(backupClient.delete()).rejects.toThrow(BackupNotFoundError)
  })
})
