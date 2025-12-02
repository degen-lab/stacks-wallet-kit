import { HDKey } from '@scure/bip32'
import { mnemonicToSeed } from '@scure/bip39'
import {
  compressPrivateKey,
  privateKeyToPublic,
  publicKeyToAddressSingleSig,
  publicKeyToHex,
} from '@stacks/transactions'
import { PrivateKeyNotFoundError } from '../../shared/errors/encryptionErrors'
import { NetworkType } from '../../shared'
import { bech32 } from 'bech32'
import bs58check from 'bs58check'
import * as btc from '@scure/btc-signer'
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

export async function generateSecretKey(
  mnemonic: string,
  passphrase?: string
): Promise<HDKey> {
  const seed = await mnemonicToSeed(mnemonic, passphrase)
  const secretKey = HDKey.fromMasterSeed(seed)
  return secretKey
}

export function makeStxDerivationPath(accountIndex: number): string {
  return `m/44'/5757'/0'/0/${accountIndex}`
}

export function deriveStxAccount(rootKey: HDKey, derivationPath: string) {
  return rootKey.derive(derivationPath)
}

export function derivePrivateKey(rootKey: HDKey, accountIndex: number): string {
  const derivationPath = makeStxDerivationPath(accountIndex)
  const accountKey = deriveStxAccount(rootKey, derivationPath)
  if (!accountKey.privateKey) {
    throw new PrivateKeyNotFoundError()
  }
  return compressPrivateKey(accountKey.privateKey)
}

export function derivePublicKey(
  rootKeyChain: HDKey,
  accountIndex: number
): string {
  const accountKey = derivePrivateKey(rootKeyChain, accountIndex)
  const publicKey = privateKeyToPublic(accountKey)
  return publicKeyToHex(publicKey)
}

export function deriveAccountAddress(publicKey: string, network: NetworkType) {
  return publicKeyToAddressSingleSig(publicKey, network)
}

export async function getFingerPrintFromMnemonic(
  mnemonic: string
): Promise<string> {
  const seed = await mnemonicToSeed(mnemonic)
  const keyChain = HDKey.fromMasterSeed(seed)
  return keyChain.fingerprint.toString(16)
}

export function stxToUstx(stx: number): bigint {
  return BigInt(Math.floor(Number(stx) * 1_000_000))
}

export function btcAddressToPoxAddress(btcAddress: string): {
  version: string
  hashBytes: string
} {
  if (btcAddress.startsWith('1') || btcAddress.startsWith('3')) {
    const decoded = bs58check.decode(btcAddress)
    const version = decoded[0]
    const hashbytes = decoded.slice(1)
    // hashBytes should be exactly 20 bytes (40 hex chars) for P2PKH or 20 bytes for P2SH
    // Don't pad, use the actual length
    return {
      version: version.toString(16).padStart(2, '0'),
      hashBytes: Buffer.from(hashbytes).toString('hex'),
    }
  }

  if (btcAddress.startsWith('bc1') || btcAddress.startsWith('tb1')) {
    const { words } = bech32.decode(btcAddress)
    const data = Buffer.from(bech32.fromWords(words.slice(1)))
    const version = words[0]
    // hashBytes should be exactly 20 bytes (40 hex chars) for P2WPKH or 32 bytes (64 hex chars) for P2WSH
    // Don't pad, use the actual length
    return {
      version: version.toString(16).padStart(2, '0'),
      hashBytes: data.toString('hex'),
    }
  }

  throw new Error('Unsupported BTC address format')
}

export async function getBitcoinAddressesFromStacksWallet(
  rootKeychain: HDKey,
  accountIndex: number
) {
  const btcMainnetPath = `m/84'/0'/${accountIndex}'`
  const btcTestnetPath = `m/84'/1'/${accountIndex}'`

  const btcMainnetAccount = rootKeychain.derive(btcMainnetPath)
  const btcTestnetAccount = rootKeychain.derive(btcTestnetPath)

  const mainnetAddressKeychain = btcMainnetAccount.deriveChild(0).deriveChild(0)
  const testnetAddressKeychain = btcTestnetAccount.deriveChild(0).deriveChild(0)
  const mainnetAddress = btc.p2wpkh(
    mainnetAddressKeychain.publicKey!,
    btc.NETWORK
  )

  const testnetAddress = btc.p2wpkh(
    testnetAddressKeychain.publicKey!,
    btc.TEST_NETWORK
  )

  return {
    mainnet: mainnetAddress.address,
    testnet: testnetAddress.address,
  }
}
