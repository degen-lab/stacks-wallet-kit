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
    }
    return wallet
  }

  createAccount(wallet: Wallet): Wallet {
    const maxIndex =
      wallet.accounts.length > 0
        ? Math.max(...wallet.accounts.map((acc) => acc.index))
        : -1
    const accountIndex = maxIndex + 1
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
    }
    return {
      wallet,
      mnemonic,
    }
  }
}
