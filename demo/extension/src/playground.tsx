import { Buffer } from 'buffer'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  NetworkType,
  type WalletAccount,
} from '@degenlab/stacks-wallet-kit-core'
import { PostConditionMode, ClarityValue } from '@stacks/transactions'
import { initializeSDK, getSDK, resetSDK } from './lib/sdk'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(globalThis as any).Buffer = Buffer
}

type StackingPool = {
  name: string
  address: string
}

type LogEntry = {
  timestamp: string
  method: string
  type: 'success' | 'error' | 'info'
  message: string
  data?: unknown
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  const scrollViewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logs.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight
    }
  }, [logs.length])

  return (
    <div
      ref={scrollViewRef}
      style={{
        height: '300px',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
        padding: '16px',
        marginBottom: '16px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      {logs.length === 0 ? (
        <div style={{ color: '#666' }}>
          No logs yet. Actions will appear here...
        </div>
      ) : (
        logs.map((log, index) => (
          <div
            key={index}
            style={{
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #ddd',
            }}
          >
            <div
              style={{
                marginBottom: '4px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontWeight: 'bold',
                  color:
                    log.type === 'success'
                      ? '#28a745'
                      : log.type === 'error'
                        ? '#dc3545'
                        : '#007bff',
                }}
              >
                [{log.type.toUpperCase()}]
              </span>
              <span style={{ color: '#666' }}>{log.timestamp}</span>
              <span style={{ fontWeight: 'bold' }}>{log.method}</span>
            </div>
            <div style={{ color: '#333' }}>{log.message}</div>
            {log.data !== undefined && (
              <pre
                style={{
                  marginTop: '4px',
                  color: '#666',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontSize: '11px',
                }}
              >
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function Playground() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>(
    NetworkType.Devnet
  )
  const [sdkAccounts, setSdkAccounts] = useState<WalletAccount[]>([])
  const [sdkInitialized, setSdkInitialized] = useState(false)

  // Shared states
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(
    null
  )
  const [balance, setBalance] = useState<number | null>(null)

  // Wallet Management states
  const [walletPassword, setWalletPassword] = useState('')
  const [walletMnemonic, setWalletMnemonic] = useState(
    'found chaos picture giraffe cancel often journey latin work click gather usage common hour fly merry recycle lecture swallow napkin expand dinner upon era'
  )
  const [walletAccountIndex, setWalletAccountIndex] = useState('0')

  // Encryption password state (separate from wallet password)
  const [encryptionPassword, setEncryptionPassword] = useState('')

  // Backup states
  const [backupPassword, setBackupPassword] = useState('')

  // Send STX states
  const [sendStxToAddress, setSendStxToAddress] = useState(
    'ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54'
  )
  const [sendStxAmount, setSendStxAmount] = useState('')
  const [sendStxMemo, setSendStxMemo] = useState('')
  const [sendStxAccountIndex, setSendStxAccountIndex] = useState('0')

  // NFT Transfer states
  const [nftContractId, setNftContractId] = useState('')
  const [nftTokenId, setNftTokenId] = useState('')
  const [nftToAddress, setNftToAddress] = useState('')
  const [nftAccountIndex, setNftAccountIndex] = useState('0')

  // FT Transfer states
  const [ftContractId, setFtContractId] = useState('')
  const [ftAmount, setFtAmount] = useState('')
  const [ftToAddress, setFtToAddress] = useState('')
  const [ftAccountIndex, setFtAccountIndex] = useState('0')

  // Stack STX states
  const [stackStxAmount, setStackStxAmount] = useState('')
  const [stackStxLockPeriod, setStackStxLockPeriod] = useState('')
  const [stackStxMaxAmount, setStackStxMaxAmount] = useState('')

  // Stack Extend states
  const [stackExtendCount, setStackExtendCount] = useState('')
  const [stackExtendMaxAmount, setStackExtendMaxAmount] = useState('')

  // Stack Increase states
  const [stackIncreaseBy, setStackIncreaseBy] = useState('')
  const [stackIncreaseMaxAmount, setStackIncreaseMaxAmount] = useState('')
  const [stackIncreaseCurrentLockPeriod, setStackIncreaseCurrentLockPeriod] =
    useState('')

  // Delegate STX states
  const [delegateAmount, setDelegateAmount] = useState('')
  const [delegatePoolName, setDelegatePoolName] = useState('')
  const [delegatePoolAddress, setDelegatePoolAddress] = useState('')
  const [delegateUntilBurnHeight, setDelegateUntilBurnHeight] = useState('')

  // Contract Call states
  const [contractCallAddress, setContractCallAddress] = useState('')
  const [contractCallFunctionName, setContractCallFunctionName] = useState('')
  const [contractCallArgs, setContractCallArgs] = useState('[]')

  const addLog = useCallback(
    (
      method: string,
      type: 'success' | 'error' | 'info',
      message: string,
      data?: unknown
    ) => {
      const entry: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        method,
        type,
        message,
        data,
      }
      console.log(
        `[SDK Playground] ${type.toUpperCase()}: ${method} - ${message}`,
        data
      )
      setLogs((prev) => [...prev, entry])
    },
    []
  )

  const executeWithLogging = useCallback(
    async <T,>(
      methodName: string,
      fn: () => Promise<T>,
      successMessage?: string | ((result: T) => string)
    ) => {
      setLoading(methodName)
      addLog(methodName, 'info', 'Starting...')
      try {
        const result = await fn()
        const message =
          typeof successMessage === 'function'
            ? successMessage(result)
            : (successMessage ?? 'Success')
        addLog(methodName, 'success', message, result)
        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        addLog(methodName, 'error', `Error: ${errorMessage}`, error)
        throw error
      } finally {
        setLoading(null)
      }
    },
    [addLog]
  )

  // Try to initialize SDK on mount (but don't fail if it doesn't work)
  useEffect(() => {
    try {
      const sdk = initializeSDK()
      if (sdk) {
        setSdkInitialized(true)
        addLog('init', 'info', 'SDK initialized successfully on mount.')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      addLog(
        'init',
        'error',
        `SDK initialization failed on mount: ${errorMessage}`
      )
      addLog(
        'init',
        'info',
        'You can try initializing manually using the button below.'
      )
    }
  }, [addLog])

  const handleInitializeSDK = async () => {
    await executeWithLogging('initializeSDK', async () => {
      const sdk = initializeSDK()
      setSdkInitialized(true)
      return sdk
    })
  }

  const handleSignIn = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog(
        'loginWithGoogle',
        'error',
        'SDK not initialized. Please initialize SDK first.'
      )
      return
    }

    await executeWithLogging(
      'loginWithGoogle',
      async () => {
        const result = await sdk.loginWithGoogle()
        return result
      },
      (result) => `Signed in successfully. Has backup: ${result.hasBackup}`
    )
  }

  const handleSignOut = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('signOut', 'error', 'SDK not initialized.')
      return
    }

    await executeWithLogging(
      'signOut',
      async () => {
        await sdk.signOut()
        setSdkAccounts([])
        return { success: true }
      },
      'Signed out successfully'
    )
  }

  const handleCreateWallet = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('createWallet', 'error', 'SDK not initialized.')
      return
    }

    await executeWithLogging(
      'createWallet',
      async () => {
        // createWallet takes optional passphrase, not mnemonic
        // The mnemonic is generated automatically
        const wallet = await sdk.createWallet(walletPassword || undefined)
        setSdkAccounts(wallet.accounts)
        return wallet
      },
      (result) => `Wallet created: ${result.accounts.length} account(s)`
    )
  }

  const handleSetEncryptionPassword = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('setEncryptionPassword', 'error', 'SDK not initialized.')
      return
    }

    if (!encryptionPassword) {
      addLog(
        'setEncryptionPassword',
        'error',
        'Encryption password is required.'
      )
      return
    }

    await executeWithLogging(
      'setEncryptionPassword',
      async () => {
        // Check if 'password' key exists in raw storage first
        // This works in both popup and full window contexts
        let hasPasswordKey = false
        try {
          hasPasswordKey = await new Promise<boolean>((resolve, reject) => {
            if (!chrome?.storage?.local) {
              console.warn(
                '[Playground] chrome.storage.local not available, assuming no password set'
              )
              resolve(false)
              return
            }
            chrome.storage.local.get(['password'], (result) => {
              if (chrome.runtime.lastError) {
                console.warn(
                  '[Playground] Error checking storage:',
                  chrome.runtime.lastError.message
                )
                resolve(false)
                return
              }
              resolve(
                'password' in result &&
                  result.password !== undefined &&
                  result.password !== null
              )
            })
          })
        } catch (error) {
          console.warn('[Playground] Error checking for password key:', error)
          // If we can't check, assume no password and try to set it
          hasPasswordKey = false
        }

        if (!hasPasswordKey) {
          // No password key exists - safe to set new password
          await sdk.setEncryptionPassword(encryptionPassword)
          return { success: true }
        }

        // Password key exists - try to set it (will validate if password matches)
        try {
          await sdk.setEncryptionPassword(encryptionPassword)
          return { success: true }
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message.includes('Invalid password') ||
              error.constructor.name === 'InvalidPasswordError')
          ) {
            // If password validation fails, it means there's encrypted data with a different password
            // Since the user says they never set a password, this is leftover data
            // Automatically clear storage and retry
            console.log(
              '[Playground] Invalid password error detected, clearing storage and retrying...'
            )
            await chrome.storage.local.clear()
            // Now try again with cleared storage
            await sdk.setEncryptionPassword(encryptionPassword)
            return {
              success: true,
              message: 'Storage cleared and password set successfully',
            }
          }
          throw error
        }
      },
      'Encryption password set successfully'
    )
  }

  const handleClearStorage = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all extension storage? This will delete all wallets, accounts, and encrypted data. This action cannot be undone.'
      )
    ) {
      return
    }

    await executeWithLogging(
      'clearStorage',
      async () => {
        // Clear Chrome storage
        await chrome.storage.local.clear()

        // Reset SDK instance (storage is already cleared above)
        resetSDK()

        // Reset all state variables
        setSdkAccounts([])
        setSelectedAccount(null)
        setBalance(null)
        setSdkInitialized(false)
        setLogs([])
        setLoading(null)

        // Reset all form fields
        setEncryptionPassword('')
        setWalletPassword('')
        setWalletMnemonic(
          'found chaos picture giraffe cancel often journey latin work click gather usage common hour fly merry recycle lecture swallow napkin expand dinner upon era'
        )
        setWalletAccountIndex('0')
        setBackupPassword('')
        setSendStxToAddress('ST1AWHANXSGZ3SY8XQC2J7S18E22KJJW9B3JT2T54')
        setSendStxAmount('')
        setSendStxMemo('')
        setSendStxAccountIndex('0')
        setNftContractId('')
        setNftTokenId('')
        setNftToAddress('')
        setNftAccountIndex('0')
        setFtContractId('')
        setFtAmount('')
        setFtToAddress('')
        setFtAccountIndex('0')
        setStackStxAmount('')
        setStackStxLockPeriod('')
        setStackStxMaxAmount('')
        setStackExtendCount('')
        setStackExtendMaxAmount('')
        setStackIncreaseBy('')
        setStackIncreaseMaxAmount('')
        setStackIncreaseCurrentLockPeriod('')
        setDelegateAmount('')
        setDelegatePoolName('')
        setDelegatePoolAddress('')
        setDelegateUntilBurnHeight('')
        setContractCallAddress('')
        setContractCallFunctionName('')
        setContractCallArgs('[]')

        return { success: true }
      },
      'All storage and state cleared successfully. You can now start fresh.'
    )
  }

  const handleLoadWallet = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('retrieveWallet', 'error', 'SDK not initialized.')
      return
    }

    if (!walletPassword) {
      addLog('retrieveWallet', 'error', 'Password is required.')
      return
    }

    await executeWithLogging(
      'retrieveWallet',
      async () => {
        await sdk.setEncryptionPassword(walletPassword)
        const { wallet, mnemonic: retrievedMnemonic } =
          await sdk.retrieveWallet(walletPassword)
        setSdkAccounts(wallet.accounts)
        setWalletMnemonic(retrievedMnemonic)
        return { wallet, mnemonic: retrievedMnemonic }
      },
      (result) => `Wallet loaded: ${result.wallet.accounts.length} account(s)`
    )
  }

  const handleGetAccounts = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('getWalletAccounts', 'error', 'SDK not initialized.')
      return
    }

    await executeWithLogging(
      'getWalletAccounts',
      async () => {
        const accounts = await sdk.getWalletAccounts()
        setSdkAccounts(accounts)
        return accounts
      },
      (result) => `Retrieved ${result.length} account(s)`
    )
  }

  const handleSendSTX = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('sendStx', 'error', 'SDK not initialized.')
      return
    }

    if (!sendStxToAddress || !sendStxAmount) {
      addLog('sendStx', 'error', 'To address and amount are required.')
      return
    }

    if (sdkAccounts.length === 0) {
      addLog(
        'sendStx',
        'error',
        'No accounts available. Please create or load a wallet first.'
      )
      return
    }

    await executeWithLogging(
      'sendStx',
      async () => {
        // sendStx(accountIndex, to, amount, network, memo?)
        // amount is in STX (number), not microSTX
        const amountInSTX = parseFloat(sendStxAmount)
        const txid = await sdk.sendStx(
          parseInt(sendStxAccountIndex),
          sendStxToAddress,
          amountInSTX,
          currentNetwork,
          sendStxMemo || undefined
        )
        return { txid }
      },
      (result) => `Transaction sent: ${result.txid}`
    )
  }

  const handleBackupWallet = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('backupWallet', 'error', 'SDK not initialized.')
      return
    }

    if (!backupPassword) {
      addLog('backupWallet', 'error', 'Password is required.')
      return
    }

    await executeWithLogging(
      'backupWallet',
      async () => {
        await sdk.backupWallet(backupPassword)
        return { success: true }
      },
      'Wallet backed up successfully'
    )
  }

  const handleDeleteBackup = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('deleteBackup', 'error', 'SDK not initialized.')
      return
    }

    if (!backupPassword) {
      addLog('deleteBackup', 'error', 'Password is required.')
      return
    }

    await executeWithLogging(
      'deleteBackup',
      async () => {
        await sdk.deleteBackup(backupPassword)
        return { success: true }
      },
      'Backup deleted successfully'
    )
  }

  const handleDeleteBackupWithoutPassword = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('deleteBackupWithoutPassword', 'error', 'SDK not initialized.')
      return
    }

    await executeWithLogging(
      'deleteBackupWithoutPassword',
      async () => {
        await sdk.deleteBackupWithoutPassword()
        return { success: true }
      },
      'Backup deleted successfully'
    )
  }

  const handleGetBalance = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('getBalance', 'error', 'SDK not initialized.')
      return
    }

    if (!selectedAccount) {
      addLog('getBalance', 'error', 'Please select an account first.')
      return
    }

    await executeWithLogging(
      'getBalance',
      async () => {
        const balance = await sdk.getBalance(selectedAccount)
        setBalance(balance)
        return { balance }
      },
      (result) => `Balance: ${result.balance} STX`
    )
  }

  const handleTransferNFT = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('transferNFT', 'error', 'SDK not initialized.')
      return
    }

    if (!nftContractId || !nftTokenId || !nftToAddress) {
      addLog(
        'transferNFT',
        'error',
        'Contract ID, Token ID, and To Address are required.'
      )
      return
    }

    await executeWithLogging(
      'transferNFT',
      async () => {
        const txid = await sdk.transferNFT(
          parseInt(nftAccountIndex),
          nftContractId,
          nftTokenId,
          nftToAddress,
          currentNetwork
        )
        return { txid }
      },
      (result) => `NFT transfer sent: ${result.txid}`
    )
  }

  const handleTransferFT = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('transferFT', 'error', 'SDK not initialized.')
      return
    }

    if (!ftContractId || !ftAmount || !ftToAddress) {
      addLog(
        'transferFT',
        'error',
        'Contract ID, Amount, and To Address are required.'
      )
      return
    }

    await executeWithLogging(
      'transferFT',
      async () => {
        const txid = await sdk.transferFT(
          parseInt(ftAccountIndex),
          ftContractId,
          parseFloat(ftAmount),
          ftToAddress,
          currentNetwork
        )
        return { txid }
      },
      (result) => `FT transfer sent: ${result.txid}`
    )
  }

  const handleStackSTX = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('stackSTX', 'error', 'SDK not initialized.')
      return
    }

    if (
      !selectedAccount ||
      !stackStxAmount ||
      !stackStxLockPeriod ||
      !stackStxMaxAmount
    ) {
      addLog(
        'stackSTX',
        'error',
        'Account, Amount, Lock Period, and Max Amount are required.'
      )
      return
    }

    await executeWithLogging(
      'stackSTX',
      async () => {
        const txid = await sdk.stackSTX(
          selectedAccount,
          parseFloat(stackStxAmount),
          parseInt(stackStxLockPeriod),
          parseFloat(stackStxMaxAmount)
        )
        return { txid }
      },
      (result) => `Stack STX transaction sent: ${result.txid}`
    )
  }

  const handleStackExtend = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('stackExtend', 'error', 'SDK not initialized.')
      return
    }

    if (!selectedAccount || !stackExtendCount || !stackExtendMaxAmount) {
      addLog(
        'stackExtend',
        'error',
        'Account, Extend Count, and Max Amount are required.'
      )
      return
    }

    await executeWithLogging(
      'stackExtend',
      async () => {
        const txid = await sdk.stackExtend(
          selectedAccount,
          parseInt(stackExtendCount),
          parseFloat(stackExtendMaxAmount)
        )
        return { txid }
      },
      (result) => `Stack extend transaction sent: ${result.txid}`
    )
  }

  const handleStackIncrease = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('stackIncrease', 'error', 'SDK not initialized.')
      return
    }

    if (
      !selectedAccount ||
      !stackIncreaseBy ||
      !stackIncreaseMaxAmount ||
      !stackIncreaseCurrentLockPeriod
    ) {
      addLog(
        'stackIncrease',
        'error',
        'Account, Increase By, Max Amount, and Current Lock Period are required.'
      )
      return
    }

    await executeWithLogging(
      'stackIncrease',
      async () => {
        const txid = await sdk.stackIncrease(
          selectedAccount,
          parseFloat(stackIncreaseBy),
          parseFloat(stackIncreaseMaxAmount),
          parseInt(stackIncreaseCurrentLockPeriod)
        )
        return { txid }
      },
      (result) => `Stack increase transaction sent: ${result.txid}`
    )
  }

  const handleDelegateSTX = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('delegateSTX', 'error', 'SDK not initialized.')
      return
    }

    if (
      !selectedAccount ||
      !delegateAmount ||
      !delegatePoolName ||
      !delegatePoolAddress
    ) {
      addLog(
        'delegateSTX',
        'error',
        'Account, Amount, Pool Name, and Pool Address are required.'
      )
      return
    }

    await executeWithLogging(
      'delegateSTX',
      async () => {
        const pool: StackingPool = {
          name: delegatePoolName,
          address: delegatePoolAddress,
        }
        const txid = await sdk.delegateSTX(
          selectedAccount,
          parseFloat(delegateAmount),
          pool,
          delegateUntilBurnHeight
            ? parseInt(delegateUntilBurnHeight)
            : undefined
        )
        return { txid }
      },
      (result) => `Delegation transaction sent: ${result.txid}`
    )
  }

  const handleRevokeDelegation = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('revokeDelegation', 'error', 'SDK not initialized.')
      return
    }

    if (!selectedAccount) {
      addLog('revokeDelegation', 'error', 'Please select an account first.')
      return
    }

    await executeWithLogging(
      'revokeDelegation',
      async () => {
        const txid = await sdk.revokeDelegation(selectedAccount)
        return { txid }
      },
      (result) => `Revocation transaction sent: ${result.txid}`
    )
  }

  const handleCreateAccount = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('createAccount', 'error', 'SDK not initialized.')
      return
    }

    await executeWithLogging(
      'createAccount',
      async () => {
        const account = await sdk.createAccount()
        const accounts = await sdk.getWalletAccounts()
        setSdkAccounts(accounts)
        return account
      },
      (result) => `Account created: Index ${result.index}`
    )
  }

  const handleStoreExistingWallet = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('storeExistingWallet', 'error', 'SDK not initialized.')
      return
    }

    if (!walletMnemonic) {
      addLog('storeExistingWallet', 'error', 'Mnemonic is required.')
      return
    }

    await executeWithLogging(
      'storeExistingWallet',
      async () => {
        const wallet = await sdk.storeExistingWallet(
          walletMnemonic,
          walletPassword || undefined
        )
        setSdkAccounts(wallet.accounts)
        return wallet
      },
      (result) => `Wallet stored: ${result.accounts.length} account(s)`
    )
  }

  const handleSetNetwork = (network: NetworkType) => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('setNetwork', 'error', 'SDK not initialized.')
      return
    }

    try {
      sdk.setNetwork(network)
      setCurrentNetwork(network) // Update the state to reflect the change
      addLog('setNetwork', 'success', `Network set to: ${network}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      addLog('setNetwork', 'error', `Error: ${errorMessage}`)
    }
  }

  const handleMakeContractCall = async () => {
    const sdk = getSDK()
    if (!sdk) {
      addLog('makeContractCall', 'error', 'SDK not initialized.')
      return
    }

    if (!contractCallAddress || !contractCallFunctionName) {
      addLog(
        'makeContractCall',
        'error',
        'Contract Address and Function Name are required.'
      )
      return
    }

    await executeWithLogging(
      'makeContractCall',
      async () => {
        let args: ClarityValue[] = []
        try {
          args = JSON.parse(contractCallArgs)
        } catch (e) {
          throw new Error('Invalid function arguments JSON')
        }
        const txid = await sdk.makeContractCall(
          contractCallAddress,
          contractCallFunctionName,
          args,
          PostConditionMode.Deny
        )
        return { txid }
      },
      (result) => `Contract call sent: ${result.txid}`
    )
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    margin: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    margin: '4px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Stacks Wallet Kit SDK Playground</h1>
      <p>Test the SDK functionality in this playground.</p>

      <LogViewer logs={logs} />

      <div style={sectionStyle}>
        <h2>SDK Initialization</h2>
        <p>
          Status: {sdkInitialized ? '✅ Initialized' : '❌ Not Initialized'}
        </p>
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            ⚠️ Google OAuth Redirect URI Setup:
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Your Extension Redirect URI:</strong>
            <div
              style={{
                marginTop: '4px',
                padding: '8px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all',
              }}
            >
              {chrome.identity.getRedirectURL()}
            </div>
            <button
              style={{
                ...buttonStyle,
                padding: '4px 12px',
                fontSize: '12px',
                marginTop: '8px',
              }}
              onClick={() => {
                navigator.clipboard.writeText(chrome.identity.getRedirectURL())
                addLog('copy', 'info', 'Redirect URI copied to clipboard')
              }}
            >
              Copy Redirect URI
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#856404' }}>
            <strong>Instructions:</strong>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Copy the redirect URI above</li>
              <li>
                Go to{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#007bff' }}
                >
                  Google Cloud Console → APIs & Services → Credentials
                </a>
              </li>
              <li>
                Click on your OAuth 2.0 Client ID (same one used in
                leather-extension)
              </li>
              <li>Add the redirect URI to "Authorized redirect URIs"</li>
              <li>Click "Save"</li>
            </ol>
            <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
              Note: Each time you reload the extension, the extension ID may
              change. If you get a redirect_uri_mismatch error, copy the new
              redirect URI and add it to Google Cloud Console.
            </div>
          </div>
        </div>
        <button
          style={{
            ...buttonStyle,
            ...(loading === 'initializeSDK'
              ? { opacity: 0.6, cursor: 'not-allowed' }
              : {}),
          }}
          onClick={(e) => {
            e.preventDefault()
            console.log('[Playground] Initialize SDK button clicked')
            handleInitializeSDK().catch((err) => {
              console.error('[Playground] Error in handleInitializeSDK:', err)
            })
          }}
          disabled={loading === 'initializeSDK'}
        >
          {loading === 'initializeSDK'
            ? 'Initializing...'
            : sdkInitialized
              ? 'Re-initialize SDK'
              : 'Initialize SDK'}
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Authentication</h2>
        <button
          style={buttonStyle}
          onClick={handleSignIn}
          disabled={loading !== null || !sdkInitialized}
        >
          Sign In with Google
        </button>
        <button
          style={buttonStyle}
          onClick={handleSignOut}
          disabled={loading !== null || !sdkInitialized}
        >
          Sign Out
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Encryption Password</h2>
        <div
          style={{
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <strong>Note:</strong> If you get an "Invalid password" error, it
          means there's existing encrypted data with a different password. Clear
          storage first, then set a new password.
        </div>
        <div>
          <label>
            Encryption Password:
            <input
              style={inputStyle}
              type="password"
              value={encryptionPassword}
              onChange={(e) => setEncryptionPassword(e.target.value)}
              placeholder="Enter password for encryption"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleSetEncryptionPassword}
          disabled={loading !== null || !sdkInitialized}
        >
          Set Encryption Password
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: '#dc3545',
            marginLeft: '8px',
          }}
          onClick={handleClearStorage}
          disabled={loading !== null}
        >
          Clear Storage
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Wallet Management</h2>
        <div>
          <label>
            Wallet Password (for create/store):
            <input
              style={inputStyle}
              type="password"
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
              placeholder="Enter password for wallet"
            />
          </label>
        </div>
        <div>
          <label>
            Mnemonic (for store existing wallet):
            <textarea
              style={inputStyle}
              value={walletMnemonic}
              onChange={(e) => setWalletMnemonic(e.target.value)}
              rows={3}
            />
          </label>
        </div>
        <div>
          <label>
            Account Index (for store existing wallet):
            <input
              style={inputStyle}
              type="number"
              value={walletAccountIndex}
              onChange={(e) => setWalletAccountIndex(e.target.value)}
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleCreateWallet}
          disabled={loading !== null || !sdkInitialized}
        >
          Create Wallet
        </button>
        <button
          style={buttonStyle}
          onClick={handleLoadWallet}
          disabled={loading !== null || !sdkInitialized}
        >
          Load Wallet
        </button>
        <button
          style={buttonStyle}
          onClick={handleGetAccounts}
          disabled={loading !== null || !sdkInitialized}
        >
          Get Accounts
        </button>
        <button
          style={buttonStyle}
          onClick={handleCreateAccount}
          disabled={loading !== null || !sdkInitialized}
        >
          Create Account
        </button>
        <button
          style={buttonStyle}
          onClick={handleStoreExistingWallet}
          disabled={loading !== null || !sdkInitialized}
        >
          Store Existing Wallet
        </button>
        {sdkAccounts.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3>Accounts ({sdkAccounts.length})</h3>
            {sdkAccounts.map((account, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  border:
                    selectedAccount?.index === account.index
                      ? '2px solid #007bff'
                      : '1px solid #ddd',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedAccount(account)}
              >
                <div>
                  <strong>Index:</strong> {account.index}
                </div>
                <div>
                  <strong>Mainnet Address:</strong> {account.addresses.mainnet}
                </div>
                <div>
                  <strong>Testnet Address:</strong> {account.addresses.testnet}
                </div>
                <div>
                  <strong>Public Key:</strong>{' '}
                  {account.publicKey.substring(0, 20)}...
                </div>
                {selectedAccount?.index === account.index && (
                  <div style={{ marginTop: '8px', color: '#007bff' }}>
                    ✓ Selected
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h2>Backup</h2>
        <div>
          <label>
            Backup Password:
            <input
              style={inputStyle}
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Enter password for backup"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleBackupWallet}
          disabled={loading !== null || !sdkInitialized}
        >
          Backup Wallet
        </button>
        <button
          style={buttonStyle}
          onClick={handleDeleteBackup}
          disabled={loading !== null || !sdkInitialized}
        >
          Delete Backup
        </button>
        <button
          style={buttonStyle}
          onClick={handleDeleteBackupWithoutPassword}
          disabled={loading !== null || !sdkInitialized}
        >
          Delete Backup (No Password)
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Account Info & Balance</h2>
        {selectedAccount ? (
          <div>
            <p>
              <strong>Selected Account:</strong> Index {selectedAccount.index} -{' '}
              {selectedAccount.addresses.testnet}
            </p>
            <button
              style={buttonStyle}
              onClick={handleGetBalance}
              disabled={loading !== null || !sdkInitialized}
            >
              Get Balance
            </button>
            {balance !== null && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#e7f3ff',
                  borderRadius: '4px',
                }}
              >
                <strong>Balance:</strong> {balance} STX
              </div>
            )}
          </div>
        ) : sdkAccounts.length > 0 ? (
          <div>
            <p style={{ color: '#666', marginBottom: '8px' }}>
              Select an account from the list below, or click "Get Balance" to
              use the first account
            </p>
            <button
              style={buttonStyle}
              onClick={async () => {
                // Auto-select first account if none selected
                if (!selectedAccount && sdkAccounts.length > 0) {
                  setSelectedAccount(sdkAccounts[0])
                  // Wait a bit for state to update, then get balance
                  setTimeout(() => {
                    handleGetBalance()
                  }, 100)
                } else {
                  handleGetBalance()
                }
              }}
              disabled={
                loading !== null || !sdkInitialized || sdkAccounts.length === 0
              }
            >
              Get Balance (First Account)
            </button>
          </div>
        ) : (
          <p style={{ color: '#666' }}>
            No accounts available. Please create or load a wallet first.
          </p>
        )}
      </div>

      <div style={sectionStyle}>
        <h2>Network</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            style={buttonStyle}
            onClick={() => handleSetNetwork(NetworkType.Mainnet)}
            disabled={loading !== null || !sdkInitialized}
          >
            Set Mainnet
          </button>
          <button
            style={buttonStyle}
            onClick={() => handleSetNetwork(NetworkType.Testnet)}
            disabled={loading !== null || !sdkInitialized}
          >
            Set Testnet
          </button>
          <button
            style={buttonStyle}
            onClick={() => handleSetNetwork(NetworkType.Devnet)}
            disabled={loading !== null || !sdkInitialized}
          >
            Set Devnet
          </button>
        </div>
        <p>
          <strong>Current Network:</strong>{' '}
          {currentNetwork === NetworkType.Mainnet
            ? 'Mainnet'
            : currentNetwork === NetworkType.Testnet
              ? 'Testnet'
              : 'Devnet'}
        </p>
      </div>

      <div style={sectionStyle}>
        <h2>Send STX</h2>
        <div>
          <label>
            Account Index:
            <input
              style={inputStyle}
              type="number"
              value={sendStxAccountIndex}
              onChange={(e) => setSendStxAccountIndex(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            To Address:
            <input
              style={inputStyle}
              value={sendStxToAddress}
              onChange={(e) => setSendStxToAddress(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={sendStxAmount}
              onChange={(e) => setSendStxAmount(e.target.value)}
              placeholder="0.001"
            />
          </label>
        </div>
        <div>
          <label>
            Memo (optional):
            <input
              style={inputStyle}
              type="text"
              value={sendStxMemo}
              onChange={(e) => setSendStxMemo(e.target.value)}
              placeholder="Optional memo"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleSendSTX}
          disabled={loading !== null || !sdkInitialized}
        >
          Send STX
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>NFT Transfer</h2>
        <div>
          <label>
            Account Index:
            <input
              style={inputStyle}
              type="number"
              value={nftAccountIndex}
              onChange={(e) => setNftAccountIndex(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Contract ID:
            <input
              style={inputStyle}
              value={nftContractId}
              onChange={(e) => setNftContractId(e.target.value)}
              placeholder="SP...contract-name"
            />
          </label>
        </div>
        <div>
          <label>
            Token ID:
            <input
              style={inputStyle}
              value={nftTokenId}
              onChange={(e) => setNftTokenId(e.target.value)}
              placeholder="Token ID"
            />
          </label>
        </div>
        <div>
          <label>
            To Address:
            <input
              style={inputStyle}
              value={nftToAddress}
              onChange={(e) => setNftToAddress(e.target.value)}
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleTransferNFT}
          disabled={loading !== null || !sdkInitialized}
        >
          Transfer NFT
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>FT Transfer</h2>
        <div>
          <label>
            Account Index:
            <input
              style={inputStyle}
              type="number"
              value={ftAccountIndex}
              onChange={(e) => setFtAccountIndex(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Contract ID:
            <input
              style={inputStyle}
              value={ftContractId}
              onChange={(e) => setFtContractId(e.target.value)}
              placeholder="SP...contract-name"
            />
          </label>
        </div>
        <div>
          <label>
            Amount:
            <input
              style={inputStyle}
              type="text"
              value={ftAmount}
              onChange={(e) => setFtAmount(e.target.value)}
              placeholder="1000000"
            />
          </label>
        </div>
        <div>
          <label>
            To Address:
            <input
              style={inputStyle}
              value={ftToAddress}
              onChange={(e) => setFtToAddress(e.target.value)}
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleTransferFT}
          disabled={loading !== null || !sdkInitialized}
        >
          Transfer FT
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Stack STX</h2>
        <div>
          <label>
            Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={stackStxAmount}
              onChange={(e) => setStackStxAmount(e.target.value)}
              placeholder="1000"
            />
          </label>
        </div>
        <div>
          <label>
            Lock Period (cycles):
            <input
              style={inputStyle}
              type="number"
              value={stackStxLockPeriod}
              onChange={(e) => setStackStxLockPeriod(e.target.value)}
              placeholder="12"
            />
          </label>
        </div>
        <div>
          <label>
            Max Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={stackStxMaxAmount}
              onChange={(e) => setStackStxMaxAmount(e.target.value)}
              placeholder="1000"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleStackSTX}
          disabled={loading !== null || !sdkInitialized || !selectedAccount}
        >
          Stack STX
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Stack Extend</h2>
        <div>
          <label>
            Extend Count:
            <input
              style={inputStyle}
              type="number"
              value={stackExtendCount}
              onChange={(e) => setStackExtendCount(e.target.value)}
              placeholder="1"
            />
          </label>
        </div>
        <div>
          <label>
            Max Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={stackExtendMaxAmount}
              onChange={(e) => setStackExtendMaxAmount(e.target.value)}
              placeholder="1000"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleStackExtend}
          disabled={loading !== null || !sdkInitialized || !selectedAccount}
        >
          Extend Stack
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Stack Increase</h2>
        <div>
          <label>
            Increase By (STX):
            <input
              style={inputStyle}
              type="text"
              value={stackIncreaseBy}
              onChange={(e) => setStackIncreaseBy(e.target.value)}
              placeholder="100"
            />
          </label>
        </div>
        <div>
          <label>
            Max Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={stackIncreaseMaxAmount}
              onChange={(e) => setStackIncreaseMaxAmount(e.target.value)}
              placeholder="1000"
            />
          </label>
        </div>
        <div>
          <label>
            Current Lock Period:
            <input
              style={inputStyle}
              type="number"
              value={stackIncreaseCurrentLockPeriod}
              onChange={(e) =>
                setStackIncreaseCurrentLockPeriod(e.target.value)
              }
              placeholder="12"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleStackIncrease}
          disabled={loading !== null || !sdkInitialized || !selectedAccount}
        >
          Increase Stack
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Delegate STX</h2>
        <div>
          <label>
            Amount (STX):
            <input
              style={inputStyle}
              type="text"
              value={delegateAmount}
              onChange={(e) => setDelegateAmount(e.target.value)}
              placeholder="1000"
            />
          </label>
        </div>
        <div>
          <label>
            Pool Name:
            <input
              style={inputStyle}
              value={delegatePoolName}
              onChange={(e) => setDelegatePoolName(e.target.value)}
              placeholder="Pool name"
            />
          </label>
        </div>
        <div>
          <label>
            Pool Address:
            <input
              style={inputStyle}
              value={delegatePoolAddress}
              onChange={(e) => setDelegatePoolAddress(e.target.value)}
              placeholder="SP..."
            />
          </label>
        </div>
        <div>
          <label>
            Until Burn Height (optional):
            <input
              style={inputStyle}
              type="number"
              value={delegateUntilBurnHeight}
              onChange={(e) => setDelegateUntilBurnHeight(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleDelegateSTX}
          disabled={loading !== null || !sdkInitialized || !selectedAccount}
        >
          Delegate STX
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Revoke Delegation</h2>
        <button
          style={buttonStyle}
          onClick={handleRevokeDelegation}
          disabled={loading !== null || !sdkInitialized || !selectedAccount}
        >
          Revoke Delegation
        </button>
      </div>

      <div style={sectionStyle}>
        <h2>Contract Call</h2>
        <div>
          <label>
            Contract Address:
            <input
              style={inputStyle}
              value={contractCallAddress}
              onChange={(e) => setContractCallAddress(e.target.value)}
              placeholder="SP...contract-name"
            />
          </label>
        </div>
        <div>
          <label>
            Function Name:
            <input
              style={inputStyle}
              value={contractCallFunctionName}
              onChange={(e) => setContractCallFunctionName(e.target.value)}
              placeholder="function-name"
            />
          </label>
        </div>
        <div>
          <label>
            Function Args (JSON array):
            <textarea
              style={inputStyle}
              value={contractCallArgs}
              onChange={(e) => setContractCallArgs(e.target.value)}
              rows={3}
              placeholder='[{"type": "uint", "value": "100"}]'
            />
          </label>
        </div>
        <button
          style={buttonStyle}
          onClick={handleMakeContractCall}
          disabled={loading !== null || !sdkInitialized}
        >
          Make Contract Call
        </button>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Playground />)
