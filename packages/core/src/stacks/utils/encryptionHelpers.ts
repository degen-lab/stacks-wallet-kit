import { Wallet, WalletEnvelope } from '../../shared'
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { randomBytes } from '@noble/ciphers/utils.js'
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { InvalidMnemonicError } from '../../shared/errors/encryptionErrors'

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export async function encryptEnvelopeData(
  mnemonic: string,
  wallet: Wallet,
  password: string
) {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new InvalidMnemonicError()
  }

  const masterKey = randomBytes(32)

  const mnemonicNonce = randomBytes(24)
  const cypher = xchacha20poly1305(masterKey, mnemonicNonce)
  const encryptedMnemonic = cypher.encrypt(new TextEncoder().encode(mnemonic))

  const walletNonce = randomBytes(24)
  const walletCypher = xchacha20poly1305(masterKey, walletNonce)

  const serializableWallet = {
    ...wallet,
    privateKey: wallet.privateKey,
  }
  const encryptedWallet = walletCypher.encrypt(
    new TextEncoder().encode(JSON.stringify(serializableWallet))
  )
  const passwordBytes = new TextEncoder().encode(password)
  const salt = randomBytes(16)

  const kek = pbkdf2(sha256, passwordBytes, salt, {
    c: 1000,
    dkLen: 32,
  })

  const wrapNonce = randomBytes(24)
  const wrapCypher = xchacha20poly1305(kek, wrapNonce)
  const wrappedMasterKey = wrapCypher.encrypt(masterKey)

  return {
    encryptedMnemonic: toBase64(encryptedMnemonic),
    mnemonicNonce: toBase64(mnemonicNonce),
    salt: toBase64(salt),
    iterations: 1000,
    wrappedMasterKey: toBase64(wrappedMasterKey),
    wrapNonce: toBase64(wrapNonce),
    encryptedWallet: toBase64(encryptedWallet),
    walletNonce: toBase64(walletNonce),
  }
}

export async function decryptEnvelopeData(
  envelope: WalletEnvelope,
  password: string
) {
  const salt = fromBase64(envelope.protection.kdf.salt)
  const passwordBytes = new TextEncoder().encode(password)
  const kek = pbkdf2(sha256, passwordBytes, salt, {
    c: envelope.protection.kdf.iterations,
    dkLen: 32,
  })
  const wrapNonce = fromBase64(envelope.protection.wrapNonce)
  const wrapCypher = xchacha20poly1305(kek, wrapNonce)
  const masterKey = wrapCypher.decrypt(
    fromBase64(envelope.protection.wrappedMasterKey)
  )
  const mnemonicNonce = fromBase64(envelope.mnemonicNonce)
  const mnemonicCypher = xchacha20poly1305(masterKey, mnemonicNonce)
  const mnemonic = mnemonicCypher.decrypt(fromBase64(envelope.mnemonic))
  const walletNonce = fromBase64(envelope.walletNonce)
  const walletCypher = xchacha20poly1305(masterKey, walletNonce)
  const walletBytes = walletCypher.decrypt(fromBase64(envelope.wallet))
  const walletJson = JSON.parse(new TextDecoder().decode(walletBytes))
  return {
    mnemonic: new TextDecoder().decode(mnemonic),
    wallet: {
      ...walletJson,
      privateKey: walletJson.privateKey,
    } as Wallet,
  }
}

export function decryptMnemonic(
  salt: string,
  wrapNonce: string,
  wrappedMasterKey: string,
  mnemonicNonce: string,
  encryptedMnemonic: string,
  password: string
) {
  const saltBytes = fromBase64(salt)
  const passwordBytes = new TextEncoder().encode(password)
  const kek = pbkdf2(sha256, passwordBytes, saltBytes, {
    c: 1000,
    dkLen: 32,
  })
  const wrapNonceBytes = fromBase64(wrapNonce)
  const wrapCypher = xchacha20poly1305(kek, wrapNonceBytes)
  const masterKey = wrapCypher.decrypt(fromBase64(wrappedMasterKey))
  const mnemonicNonceBytes = fromBase64(mnemonicNonce)
  const mnemonicCypher = xchacha20poly1305(masterKey, mnemonicNonceBytes)
  const mnemonic = mnemonicCypher.decrypt(fromBase64(encryptedMnemonic))
  return new TextDecoder().decode(mnemonic)
}

export async function encryptData(
  value: string,
  password: string
): Promise<string> {
  const salt = randomBytes(16)
  const nonce = randomBytes(24)

  const passwordBytes = new TextEncoder().encode(password)
  const key = pbkdf2(sha256, passwordBytes, salt, {
    c: 100000,
    dkLen: 32,
  })

  const cipher = xchacha20poly1305(key, nonce)
  const encrypted = cipher.encrypt(new TextEncoder().encode(value))

  return `${toBase64(salt)}:${toBase64(nonce)}:${toBase64(encrypted)}`
}

export async function decryptData(
  encryptedValue: string,
  password: string
): Promise<string> {
  const [saltB64, nonceB64, encryptedB64] = encryptedValue.split(':')

  if (!saltB64 || !nonceB64 || !encryptedB64) {
    throw new Error('Invalid encrypted data format')
  }

  const salt = fromBase64(saltB64)
  const nonce = fromBase64(nonceB64)
  const encrypted = fromBase64(encryptedB64)

  const passwordBytes = new TextEncoder().encode(password)
  const key = pbkdf2(sha256, passwordBytes, salt, {
    c: 100000,
    dkLen: 32,
  })

  const cipher = xchacha20poly1305(key, nonce)
  const decrypted = cipher.decrypt(encrypted)

  return new TextDecoder().decode(decrypted)
}
