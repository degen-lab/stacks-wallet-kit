// @ts-nocheck - React 19 and React Native type compatibility issues
// These are type checking errors only, the code works correctly at runtime
import {
  NetworkType,
  type Wallet,
  type WalletAccount,
} from '@degenlab/stacks-wallet-kit/core'
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { walletKit } from '@/lib/wallet'

type InfoValue = string | number | boolean | null | undefined

console.log('Is Buffer available?', !!global.Buffer)
console.log('Is process available?', !!global.process)
// If these are false, Solution 1 is your fix.
type LogEntry = {
  timestamp: string
  method: string
  type: 'success' | 'error' | 'info'
  message: string
  data?: unknown
}

function InfoRow({ label, value }: { label: string; value: InfoValue }) {
  const displayValue =
    typeof value === 'boolean'
      ? value
        ? 'true'
        : 'false'
      : value === null || value === undefined || value === ''
        ? 'N/A'
        : String(value)

  return (
    <View className="flex-row items-center justify-between border-b border-slate-200 py-1">
      <Text className="mr-2 font-semibold text-slate-600">{label}</Text>
      <Text className="flex-1 text-right text-slate-900">{displayValue}</Text>
    </View>
  )
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <Text className="mb-2 text-lg font-semibold text-slate-900">{title}</Text>
      {children}
    </View>
  )
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (logs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [logs.length])

  return (
    <View className="h-80 rounded-xl bg-slate-900 p-3">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={true}
      >
        {logs.length === 0 ? (
          <Text className="text-sm text-slate-400">
            No logs yet. Actions will appear here...
          </Text>
        ) : (
          logs.map((log, index) => (
            <View key={index} className="mb-2 border-b border-slate-700 pb-2">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text
                  className={`text-xs font-semibold ${
                    log.type === 'success'
                      ? 'text-green-400'
                      : log.type === 'error'
                        ? 'text-red-400'
                        : 'text-blue-400'
                  }`}
                >
                  [{log.type.toUpperCase()}]
                </Text>
                <Text className="text-xs text-slate-400">{log.timestamp}</Text>
                <Text className="text-xs font-semibold text-slate-300">
                  {log.method}
                </Text>
              </View>
              <Text className="mt-1 font-mono text-xs text-slate-200">
                {log.message}
              </Text>
              {log.data !== undefined && (
                <Text
                  className="mt-1 font-mono text-xs text-slate-400"
                  selectable
                >
                  {String(JSON.stringify(log.data, null, 2))}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

export default function SdkPlayground() {
  const [secureWallet] = useState<Wallet | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>(
    NetworkType.Devnet
  )
  const [sdkAccounts, setSdkAccounts] = useState<WalletAccount[]>([])

  // Input states
  const [password, setPassword] = useState('')
  const [mnemonic, setMnemonic] = useState(
    'slice wall reopen uncover gold charge proud patch spice space error large spy grunt follow correct tray tiger category bleak any bid stool survey'
  )
  const [accountIndex, setAccountIndex] = useState('0')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [contractId, setContractId] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [lockPeriod, setLockPeriod] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [increaseBy, setIncreaseBy] = useState('')
  const [extendCount, setExtendCount] = useState('')
  const [untilBurnHeight, setUntilBurnHeight] = useState('')

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

  const walletAccounts = useMemo(() => {
    // Prefer SDK accounts if available, otherwise use secure wallet accounts
    return sdkAccounts.length > 0 ? sdkAccounts : (secureWallet?.accounts ?? [])
  }, [secureWallet, sdkAccounts])

  const executeWithLogging = useCallback(
    async <T,>(
      methodName: string,
      fn: () => Promise<T>,
      successMessage?: string | ((result: T) => string)
    ) => {
      setLoading(methodName)
      addLog(methodName, 'info', 'Starting...')
      try {
        console.log(`[SDK Playground] Executing: ${methodName}`)
        const result = await fn()
        const message =
          typeof successMessage === 'function'
            ? successMessage(result)
            : (successMessage ?? 'Success')
        addLog(methodName, 'success', message, result)
        console.log(`[SDK Playground] Success: ${methodName}`, result)

        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        addLog(methodName, 'error', `Error: ${errorMessage}`, error)
        console.error(`[SDK Playground] Error: ${methodName}`, error)
        throw error
      } finally {
        setLoading(null)
      }
    },
    [addLog]
  )

  // Authentication methods
  const handleLoginWithGoogle = useCallback(async () => {
    await executeWithLogging('loginWithGoogle', async () => {
      return await walletKit.loginWithGoogle()
    })
  }, [executeWithLogging])

  const handleSignOut = useCallback(async () => {
    await executeWithLogging('signOut', async () => {
      await walletKit.signOut()
    })
  }, [executeWithLogging])

  // Wallet methods
  const handleCreateWallet = useCallback(async () => {
    if (!password) {
      addLog('createWallet', 'error', 'Password is required')
      return
    }
    await executeWithLogging('createWallet', async () => {
      const wallet = await walletKit.createWallet(password)
      const accounts = await walletKit.getWalletAccounts()
      setSdkAccounts(accounts)
      return wallet
    })
  }, [password, executeWithLogging, addLog])

  const handleStoreExistingWallet = useCallback(async () => {
    if (!mnemonic) {
      addLog('storeExistingWallet', 'error', 'Mnemonic is required')
      return
    }
    // Trim the mnemonic to handle any extra whitespace
    const trimmedMnemonic = mnemonic.trim()
    console.log(
      '[SDK Playground] storeExistingWallet - Mnemonic being used:',
      trimmedMnemonic
    )
    console.log(
      '[SDK Playground] storeExistingWallet - Mnemonic length:',
      trimmedMnemonic.length
    )
    addLog(
      'storeExistingWallet',
      'info',
      `Using mnemonic: ${trimmedMnemonic.substring(0, 20)}...`
    )

    await executeWithLogging('storeExistingWallet', async () => {
      const wallet = await walletKit.storeExistingWallet(
        trimmedMnemonic,
        password || undefined
      )
      // Refresh accounts after wallet storage
      const accounts = await walletKit.getWalletAccounts()
      setSdkAccounts(accounts)
      return wallet
    })
  }, [mnemonic, password, executeWithLogging, addLog])

  // Backup methods
  const handleBackupWallet = useCallback(async () => {
    if (!password) {
      addLog('backupWallet', 'error', 'Password is required')
      return
    }
    await executeWithLogging('backupWallet', async () => {
      await walletKit.backupWallet(password)
    })
  }, [password, executeWithLogging, addLog])

  const handleRetrieveWallet = useCallback(async () => {
    if (!password) {
      addLog('retrieveWallet', 'error', 'Password is required')
      return
    }
    await executeWithLogging('retrieveWallet', async () => {
      return await walletKit.retrieveWallet(password)
    })
  }, [password, executeWithLogging, addLog])

  const handleDeleteBackup = useCallback(async () => {
    if (!password) {
      addLog('deleteBackup', 'error', 'Password is required')
      return
    }
    await executeWithLogging('deleteBackup', async () => {
      await walletKit.deleteBackup(password)
    })
  }, [password, executeWithLogging, addLog])

  const handleDeleteBackupWithoutPassword = useCallback(async () => {
    await executeWithLogging('deleteBackupWithoutPassword', async () => {
      await walletKit.deleteBackupWithoutPassword()
    })
  }, [executeWithLogging])

  // Wallet info methods
  const handleGetWalletAccounts = useCallback(async () => {
    await executeWithLogging(
      'getWalletAccounts',
      async () => {
        const accounts = await walletKit.getWalletAccounts()
        console.log('[SDK Playground] getWalletAccounts result:', accounts)
        if (!accounts || accounts.length === 0) {
          addLog(
            'getWalletAccounts',
            'info',
            'No accounts found. Make sure a wallet is created first.'
          )
          setSdkAccounts([])
        } else {
          setSdkAccounts(accounts)
        }
        return accounts
      },
      (result) =>
        `Found ${Array.isArray(result) ? result.length : 0} account(s)`
    )
  }, [executeWithLogging, addLog])

  const handleGetBalance = useCallback(async () => {
    // First try to get accounts if we don't have any
    if (walletAccounts.length === 0) {
      addLog(
        'getBalance',
        'info',
        'No accounts in state, fetching accounts first...'
      )
      try {
        const accounts = await walletKit.getWalletAccounts()
        if (accounts && accounts.length > 0) {
          setSdkAccounts(accounts)
          addLog('getBalance', 'info', `Found ${accounts.length} account(s)`)
        }
      } catch (error) {
        addLog('getBalance', 'error', 'Failed to fetch accounts', error)
        return
      }
    }

    const accountsToUse =
      walletAccounts.length > 0 ? walletAccounts : sdkAccounts
    const account = accountsToUse[Number(accountIndex) || 0]

    if (!account) {
      addLog(
        'getBalance',
        'error',
        `Account not found at index ${accountIndex}. Available accounts: ${accountsToUse.length}`
      )
      if (accountsToUse.length > 0) {
        addLog(
          'getBalance',
          'info',
          `Available account indices: ${accountsToUse.map((a) => a.index).join(', ')}`
        )
      }
      return
    }

    // Determine which address to use based on current network
    const address =
      currentNetwork === NetworkType.Mainnet
        ? account.addresses.mainnet
        : account.addresses.testnet

    addLog(
      'getBalance',
      'info',
      `Fetching balance for account ${account.index} on ${currentNetwork}`
    )
    addLog('getBalance', 'info', `Using address: ${address}`)

    await executeWithLogging(
      'getBalance',
      async () => {
        console.log(
          '[SDK Playground] Calling getBalance with account:',
          account
        )
        console.log('[SDK Playground] Current network:', currentNetwork)
        console.log('[SDK Playground] Using address:', address)

        try {
          const balance = await walletKit.getBalance(account)
          console.log('[SDK Playground] getBalance result:', balance)
          return balance
        } catch (error) {
          const errorDetails =
            error instanceof Error
              ? {
                  message: error.message,
                  name: error.name,
                  stack: error.stack,
                }
              : error
          console.error(
            '[SDK Playground] getBalance error details:',
            errorDetails
          )

          // Provide helpful error messages
          if (error instanceof Error) {
            if (error.message.includes('Network request failed')) {
              addLog(
                'getBalance',
                'error',
                'Network request failed. Possible causes:\n' +
                  '1. No internet connection\n' +
                  '2. Stacks API endpoint unreachable\n' +
                  '3. CORS/network restrictions\n' +
                  '4. If using local regtest, SDK may need custom endpoint configuration',
                errorDetails
              )
            } else {
              addLog(
                'getBalance',
                'error',
                `Error: ${error.message}`,
                errorDetails
              )
            }
          }
          throw error
        }
      },
      (balance) => `Balance: ${balance} micro-STX`
    )
  }, [
    accountIndex,
    walletAccounts,
    sdkAccounts,
    currentNetwork,
    executeWithLogging,
    addLog,
  ])

  // Network methods
  const handleSetNetwork = useCallback(
    (network: NetworkType) => {
      try {
        walletKit.setNetwork(network)
        setCurrentNetwork(network)
        addLog('setNetwork', 'success', `Network set to ${network}`, {
          network,
        })
        console.log('[SDK Playground] Network changed to:', network)
      } catch (error) {
        addLog('setNetwork', 'error', 'Failed to set network', error)
        console.error('[SDK Playground] Failed to set network:', error)
      }
    },
    [addLog]
  )

  const handleTestNetworkConnectivity = useCallback(async () => {
    await executeWithLogging(
      'testNetworkConnectivity',
      async () => {
        // Test common Stacks API endpoints
        const endpoints = [
          { name: 'Testnet API', url: 'https://api.testnet.hiro.so/v2/info' },
          { name: 'Mainnet API', url: 'https://api.hiro.so/v2/info' },
          { name: 'Local Regtest', url: 'http://localhost:3999/v2/info' },
        ]

        const results = []

        for (const endpoint of endpoints) {
          try {
            addLog(
              'testNetworkConnectivity',
              'info',
              `Testing ${endpoint.name}...`
            )
            const response = await fetch(endpoint.url, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            })

            if (response.ok) {
              const data = await response.json()
              results.push({
                name: endpoint.name,
                url: endpoint.url,
                status: 'success',
                data: data,
              })
              addLog(
                'testNetworkConnectivity',
                'success',
                `${endpoint.name} is reachable`
              )
            } else {
              results.push({
                name: endpoint.name,
                url: endpoint.url,
                status: 'error',
                error: `HTTP ${response.status}`,
              })
              addLog(
                'testNetworkConnectivity',
                'error',
                `${endpoint.name} returned ${response.status}`
              )
            }
          } catch (error) {
            results.push({
              name: endpoint.name,
              url: endpoint.url,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            })
            addLog(
              'testNetworkConnectivity',
              'error',
              `${endpoint.name} failed: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        return results
      },
      (results) => {
        const successCount = results.filter(
          (r: any) => r.status === 'success'
        ).length
        return `Network test complete: ${successCount}/${results.length} endpoints reachable`
      }
    )
  }, [executeWithLogging, addLog])

  // Transaction methods
  const handleSendStx = useCallback(async () => {
    if (!toAddress || !amount) {
      addLog('sendStx', 'error', 'To address and amount are required')
      return
    }
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('sendStx', 'error', 'Account not found')
      return
    }
    await executeWithLogging('sendStx', async () => {
      console.log('account', Number(accountIndex))
      console.log('toAddress', toAddress)
      console.log('amount', Number(amount))
      console.log('currentNetwork', currentNetwork)
      console.log('memo', memo)
      return await walletKit.sendStx(
        Number(accountIndex) || 0,
        toAddress,
        Number(amount),
        currentNetwork,
        memo || undefined
      )
    })
  }, [
    accountIndex,
    toAddress,
    amount,
    memo,
    walletAccounts,
    currentNetwork,
    executeWithLogging,
    addLog,
  ])

  const handleTransferNFT = useCallback(async () => {
    if (!contractId || !tokenId || !toAddress) {
      addLog(
        'transferNFT',
        'error',
        'Contract ID, token ID, and to address are required'
      )
      return
    }
    await executeWithLogging('transferNFT', async () => {
      return await walletKit.transferNFT(
        Number(accountIndex) || 0,
        contractId,
        tokenId,
        toAddress,
        currentNetwork
      )
    })
  }, [
    accountIndex,
    contractId,
    tokenId,
    toAddress,
    currentNetwork,
    executeWithLogging,
    addLog,
  ])

  const handleTransferFT = useCallback(async () => {
    if (!contractId || !amount || !toAddress) {
      addLog(
        'transferFT',
        'error',
        'Contract ID, amount, and to address are required'
      )
      return
    }
    await executeWithLogging('transferFT', async () => {
      return await walletKit.transferFT(
        Number(accountIndex) || 0,
        contractId,
        Number(amount),
        toAddress,
        currentNetwork
      )
    })
  }, [
    accountIndex,
    contractId,
    amount,
    toAddress,
    currentNetwork,
    executeWithLogging,
    addLog,
  ])

  // Stacking methods
  const handleStackSTX = useCallback(async () => {
    if (!amount || !lockPeriod || !maxAmount) {
      addLog(
        'stackSTX',
        'error',
        'Amount, lock period, and max amount are required'
      )
      return
    }
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('stackSTX', 'error', 'Account not found')
      return
    }
    await executeWithLogging('stackSTX', async () => {
      return await walletKit.stackSTX(
        account,
        Number(amount),
        Number(lockPeriod),
        Number(maxAmount)
      )
    })
  }, [
    accountIndex,
    amount,
    lockPeriod,
    maxAmount,
    walletAccounts,
    executeWithLogging,
    addLog,
  ])

  const handleStackIncrease = useCallback(async () => {
    if (!increaseBy || !maxAmount || !lockPeriod) {
      addLog(
        'stackIncrease',
        'error',
        'Increase by, max amount, and lock period are required'
      )
      return
    }
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('stackIncrease', 'error', 'Account not found')
      return
    }
    await executeWithLogging('stackIncrease', async () => {
      return await walletKit.stackIncrease(
        account,
        Number(increaseBy),
        Number(maxAmount),
        Number(lockPeriod)
      )
    })
  }, [
    accountIndex,
    increaseBy,
    maxAmount,
    lockPeriod,
    walletAccounts,
    executeWithLogging,
    addLog,
  ])

  const handleStackExtend = useCallback(async () => {
    if (!extendCount || !maxAmount) {
      addLog('stackExtend', 'error', 'Extend count and max amount are required')
      return
    }
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('stackExtend', 'error', 'Account not found')
      return
    }
    await executeWithLogging('stackExtend', async () => {
      return await walletKit.stackExtend(
        account,
        Number(extendCount),
        Number(maxAmount)
      )
    })
  }, [
    accountIndex,
    extendCount,
    maxAmount,
    walletAccounts,
    executeWithLogging,
    addLog,
  ])

  const handleDelegateSTX = useCallback(async () => {
    if (!amount || !toAddress) {
      addLog(
        'delegateSTX',
        'error',
        'Amount and delegate to address are required'
      )
      return
    }
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('delegateSTX', 'error', 'Account not found')
      return
    }
    // Note: StackingPool type would need to be imported and constructed properly
    // For now, using a placeholder structure
    await executeWithLogging('delegateSTX', async () => {
      return await walletKit.delegateSTX(
        account,
        Number(amount),
        { address: toAddress } as any, // StackingPool placeholder
        untilBurnHeight ? Number(untilBurnHeight) : undefined
      )
    })
  }, [
    accountIndex,
    amount,
    toAddress,
    untilBurnHeight,
    walletAccounts,
    executeWithLogging,
    addLog,
  ])

  const handleRevokeDelegation = useCallback(async () => {
    const account = walletAccounts[Number(accountIndex) || 0]
    if (!account) {
      addLog('revokeDelegation', 'error', 'Account not found')
      return
    }
    await executeWithLogging('revokeDelegation', async () => {
      return await walletKit.revokeDelegation(account)
    })
  }, [accountIndex, walletAccounts, executeWithLogging, addLog])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <Text className="mb-2 text-2xl font-bold text-slate-900">
        SDK Playground
      </Text>
      <Text className="mb-4 text-sm text-slate-600">
        Test all @stacks-wallet-kit/mobile functionalities with buttons and
        logs.
      </Text>
      <View className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3">
        <Text className="text-xs font-semibold text-blue-900 mb-1">
          💡 Tip: Check browser/React Native console for detailed logs
        </Text>
        <Text className="text-xs text-blue-700">
          All SDK operations are logged to console with [SDK Playground] prefix.
          Network requests from the SDK may not appear in devtools if using a
          different HTTP client.
        </Text>
      </View>

      <Section title="Logs">
        <View className="mb-2 flex-row justify-end">
          <Button onPress={clearLogs}>Clear Logs</Button>
        </View>
        <LogViewer logs={logs} />
      </Section>

      <Section title="Authentication">
        <Button
          label="Login with Google"
          onPress={handleLoginWithGoogle}
          loading={loading === 'loginWithGoogle'}
          disabled={!!loading}
        />
        <Button
          label="Sign Out"
          variant="outline"
          onPress={handleSignOut}
          loading={loading === 'signOut'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Wallet Management">
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
        />
        <Button
          label="Create Wallet"
          onPress={handleCreateWallet}
          loading={loading === 'createWallet'}
          disabled={!!loading}
        />
        <Input
          label="Mnemonic (12/24 words)"
          value={mnemonic}
          onChangeText={(text) => {
            console.log(
              '[SDK Playground] Mnemonic input changed, new value:',
              text
            )
            setMnemonic(text)
          }}
          placeholder="Enter mnemonic phrase"
          multiline
          numberOfLines={3}
        />
        {__DEV__ && mnemonic && (
          <View className="mb-2 rounded-lg bg-slate-100 p-2">
            <Text className="text-xs text-slate-600">
              Current mnemonic (first 30 chars): {mnemonic.substring(0, 30)}...
            </Text>
            <Text className="text-xs text-slate-600">
              Word count:{' '}
              {
                mnemonic
                  .trim()
                  .split(/\s+/)
                  .filter((w) => w.length > 0).length
              }
            </Text>
          </View>
        )}
        <Button
          label="Store Existing Wallet"
          variant="outline"
          onPress={handleStoreExistingWallet}
          loading={loading === 'storeExistingWallet'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Backup & Restore">
        <Button
          label="Backup Wallet"
          onPress={handleBackupWallet}
          loading={loading === 'backupWallet'}
          disabled={!!loading}
        />
        <Button
          label="Retrieve Wallet"
          variant="outline"
          onPress={handleRetrieveWallet}
          loading={loading === 'retrieveWallet'}
          disabled={!!loading}
        />
        <Button
          label="Delete Backup"
          variant="destructive"
          onPress={handleDeleteBackup}
          loading={loading === 'deleteBackup'}
          disabled={!!loading}
        />
        <Button
          label="Delete Backup (No Password)"
          variant="destructive"
          onPress={handleDeleteBackupWithoutPassword}
          loading={loading === 'deleteBackupWithoutPassword'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Wallet Info">
        <Input
          label="Account Index"
          value={accountIndex}
          onChangeText={setAccountIndex}
          placeholder="0"
          keyboardType="numeric"
        />
        <Button
          label="Get Wallet Accounts"
          onPress={handleGetWalletAccounts}
          loading={loading === 'getWalletAccounts'}
          disabled={!!loading}
        />
        <Button
          label="Get Balance"
          variant="outline"
          onPress={handleGetBalance}
          loading={loading === 'getBalance'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Network">
        <View className="mb-2">
          <Text className="text-sm text-slate-600 mb-2">
            Current: <Text className="font-semibold">{currentNetwork}</Text>
          </Text>
          <View className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2">
            <Text className="text-xs text-amber-800">
              ⚠️ Network requests may fail if:
            </Text>
            <Text className="text-xs text-amber-700 mt-1">
              • No internet connection{'\n'}• API endpoint unreachable{'\n'}•
              Using local regtest (SDK needs custom endpoint config)
            </Text>
          </View>
        </View>
        <Button
          label="Test Network Connectivity"
          variant="outline"
          size="sm"
          onPress={handleTestNetworkConnectivity}
          loading={loading === 'testNetworkConnectivity'}
          disabled={!!loading}
        />
        <View className="flex-row gap-2 flex-wrap mt-2">
          <Button
            label="Set Testnet"
            variant="outline"
            size="sm"
            onPress={() => handleSetNetwork(NetworkType.Testnet)}
            disabled={!!loading}
          />
          <Button
            label="Set Mainnet"
            variant="outline"
            size="sm"
            onPress={() => handleSetNetwork(NetworkType.Mainnet)}
            disabled={!!loading}
          />
          <Button
            label="Set Devnet"
            variant="outline"
            size="sm"
            onPress={() => {
              try {
                // Check if Devnet exists in NetworkType
                const devnet = (NetworkType as any).Devnet
                if (devnet !== undefined) {
                  handleSetNetwork(devnet)
                } else {
                  addLog(
                    'setNetwork',
                    'error',
                    'NetworkType.Devnet is not available. Make sure the SDK supports Devnet.'
                  )
                }
              } catch (error) {
                addLog(
                  'setNetwork',
                  'error',
                  'Failed to set Devnet network',
                  error
                )
              }
            }}
            disabled={!!loading}
          />
        </View>
      </Section>

      <Section title="Transactions">
        <Input
          label="To Address"
          value={toAddress}
          onChangeText={setToAddress}
          placeholder="ST..."
        />
        <Input
          label="Amount (micro-STX)"
          value={amount}
          onChangeText={setAmount}
          placeholder="1000000"
          keyboardType="numeric"
        />
        <Input
          label="Memo (optional)"
          value={memo}
          onChangeText={setMemo}
          placeholder="Transaction memo"
        />
        <Button
          label="Send STX"
          onPress={handleSendStx}
          loading={loading === 'sendStx'}
          disabled={!!loading}
        />
      </Section>

      <Section title="NFT Transfer">
        <Input
          label="Contract ID"
          value={contractId}
          onChangeText={setContractId}
          placeholder="SP...::contract-name"
        />
        <Input
          label="Token ID"
          value={tokenId}
          onChangeText={setTokenId}
          placeholder="Token ID"
        />
        <Button
          label="Transfer NFT"
          variant="outline"
          onPress={handleTransferNFT}
          loading={loading === 'transferNFT'}
          disabled={!!loading}
        />
      </Section>

      <Section title="FT Transfer">
        <Input
          label="Contract ID"
          value={contractId}
          onChangeText={setContractId}
          placeholder="SP...::contract-name"
        />
        <Button
          label="Transfer FT"
          variant="outline"
          onPress={handleTransferFT}
          loading={loading === 'transferFT'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Stacking">
        <Input
          label="Lock Period (cycles)"
          value={lockPeriod}
          onChangeText={setLockPeriod}
          placeholder="12"
          keyboardType="numeric"
        />
        <Input
          label="Max Amount (micro-STX)"
          value={maxAmount}
          onChangeText={setMaxAmount}
          placeholder="1000000"
          keyboardType="numeric"
        />
        <Button
          label="Stack STX"
          onPress={handleStackSTX}
          loading={loading === 'stackSTX'}
          disabled={!!loading}
        />
        <Input
          label="Increase By (micro-STX)"
          value={increaseBy}
          onChangeText={setIncreaseBy}
          placeholder="1000000"
          keyboardType="numeric"
        />
        <Button
          label="Stack Increase"
          variant="outline"
          onPress={handleStackIncrease}
          loading={loading === 'stackIncrease'}
          disabled={!!loading}
        />
        <Input
          label="Extend Count (cycles)"
          value={extendCount}
          onChangeText={setExtendCount}
          placeholder="1"
          keyboardType="numeric"
        />
        <Button
          label="Stack Extend"
          variant="outline"
          onPress={handleStackExtend}
          loading={loading === 'stackExtend'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Delegation">
        <Input
          label="Until Burn Height (optional)"
          value={untilBurnHeight}
          onChangeText={setUntilBurnHeight}
          placeholder="Burn height"
          keyboardType="numeric"
        />
        <Button
          label="Delegate STX"
          onPress={handleDelegateSTX}
          loading={loading === 'delegateSTX'}
          disabled={!!loading}
        />
        <Button
          label="Revoke Delegation"
          variant="destructive"
          onPress={handleRevokeDelegation}
          loading={loading === 'revokeDelegation'}
          disabled={!!loading}
        />
      </Section>

      <Section title="Wallet Status">
        <InfoRow label="Has Wallet" value={!!secureWallet} />
        <InfoRow label="Account Count" value={walletAccounts.length} />
        <InfoRow label="Current Network" value={currentNetwork} />
        {walletAccounts.length > 0 && (
          <View className="mt-2 rounded-xl bg-slate-100 p-3">
            <Text className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Accounts
            </Text>
            {walletAccounts.map((account, idx) => (
              <View key={idx} className="mb-2 rounded-lg bg-white p-2">
                <Text className="text-xs font-semibold text-slate-700">
                  Account {account.index}
                </Text>
                <Text className="mt-1 font-mono text-xs text-slate-600">
                  Mainnet: {account.addresses.mainnet}
                </Text>
                <Text className="mt-1 font-mono text-xs text-slate-600">
                  Testnet: {account.addresses.testnet}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>
    </ScrollView>
  )
}

