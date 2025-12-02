import { IGoogleBackupClient } from '../../../src'

export const mockBackupClient: IGoogleBackupClient = {
  upload: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
  download: jest.fn(),
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
}
