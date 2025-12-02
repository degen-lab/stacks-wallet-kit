export const mockEncrypt = jest.fn(
  async (value: string, password: string): Promise<string> => {
    // Simple mock encryption: base64 encode with prefix
    return `encrypted:${Buffer.from(value).toString('base64')}:${password}`
  }
)

export const mockDecrypt = jest.fn(
  async (encryptedValue: string, password: string): Promise<string> => {
    // Simple mock decryption: extract base64 and decode
    const match = encryptedValue.match(/^encrypted:(.+):(.+)$/)
    if (!match || match[2] !== password) {
      throw new Error('Decryption failed')
    }
    return Buffer.from(match[1], 'base64').toString('utf-8')
  }
)
