import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { IWalletManager, NetworkType, Wallet } from '../../shared'
import {
  deriveAccountAddress,
  derivePublicKey,
  generateSecretKey,
} from '../index'
import { HDKey } from '@scure/bip32'

export class WalletManager implements IWalletManager {
  async createExistingWallet(
    mnemonic: string,
    passphrase?: string
  ): Promise<Wallet> {
    const secretKey = await generateSecretKey(mnemonic, passphrase)
    const accountPublicKey = derivePublicKey(secretKey, 0)
    const wallet: Wallet = {
      privateKey: secretKey.privateExtendedKey,
      createdAt: new Date().toString(),
      accounts: [
        {
          index: 0,
          publicKey: accountPublicKey,
          addresses: {
            mainnet: deriveAccountAddress(
              accountPublicKey,
              NetworkType.Mainnet
            ),
            testnet: deriveAccountAddress(
              accountPublicKey,
              NetworkType.Testnet
            ),
          },
        },
      ],
      deletedIndices: [],
    }
    return wallet
  }

  createAccount(wallet: Wallet): Wallet {
    // Check if there are any deleted indices to reuse
    let accountIndex: number
    let updatedDeletedIndices = wallet.deletedIndices || []

    if (updatedDeletedIndices.length > 0) {
      // Reuse the smallest deleted index
      accountIndex = Math.min(...updatedDeletedIndices)
      // Remove it from the deleted indices list
      updatedDeletedIndices = updatedDeletedIndices.filter(
        (idx) => idx !== accountIndex
      )
    } else {
      // No deleted indices, use the next sequential index
      const maxIndex =
        wallet.accounts.length > 0
          ? Math.max(...wallet.accounts.map((acc) => acc.index))
          : -1
      accountIndex = maxIndex + 1
    }

    const accountPublicKey = derivePublicKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      accountIndex
    )
    const addresses = {
      mainnet: deriveAccountAddress(accountPublicKey, NetworkType.Mainnet),
      testnet: deriveAccountAddress(accountPublicKey, NetworkType.Testnet),
    }

    return {
      ...wallet,
      deletedIndices: updatedDeletedIndices,
      accounts: [
        ...wallet.accounts,
        {
          index: accountIndex,
          publicKey: accountPublicKey,
          addresses,
        },
      ],
    }
  }

  async createWallet(
    passphrase?: string
  ): Promise<{ wallet: Wallet; mnemonic: string }> {
    const mnemonic = generateMnemonic(wordlist, 256)
    const secretKey = await generateSecretKey(mnemonic, passphrase)
    const accountPublicKey = derivePublicKey(secretKey, 0)
    const wallet: Wallet = {
      privateKey: secretKey.privateExtendedKey,
      createdAt: new Date().toString(),
      accounts: [
        {
          index: 0,
          publicKey: accountPublicKey,
          addresses: {
            mainnet: deriveAccountAddress(
              accountPublicKey,
              NetworkType.Mainnet
            ),
            testnet: deriveAccountAddress(
              accountPublicKey,
              NetworkType.Testnet
            ),
          },
        },
      ],
      deletedIndices: [],
    }
    return {
      wallet,
      mnemonic,
    }
  }
}
