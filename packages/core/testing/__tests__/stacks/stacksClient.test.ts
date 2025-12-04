import {
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  noneCV,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
  ClarityValue,
} from '@stacks/transactions'
import {
  STACKS_API_BASE_URL,
  STACKS_WEB_DEVNET_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  StacksClient,
  NetworkType,
} from '../../../src'

// Mock fetch globally
global.fetch = jest.fn()

describe('Stacks Client Unit Tests', () => {
  let stacksClient: StacksClient
  const mockAddress = 'SP9B1S44NK7SHZX4KX3HW1DXJXZFM4QJH9YHV746'
  const mockPrivateKey = 'ed25519-private-key'
  const mockTxid = '0x1234567890abcdef'

  beforeEach(() => {
    jest.clearAllMocks()
    stacksClient = new StacksClient(
      NetworkType.Mainnet,
      STACKS_API_BASE_URL,
      STACKS_TESTNET_API_BASE_URL,
      STACKS_WEB_DEVNET_API_BASE_URL
    )
  })

  describe('getBalance', () => {
    it('should retrieve balance for a given address successfully', async () => {
      const mockBalance = 1000000 // 1 STX in microSTX
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: mockBalance }),
        text: async () => '',
      })

      const balance = await stacksClient.getBalance({
        index: 0,
        publicKey: 'mock-public-key',
        addresses: {
          mainnet: mockAddress,
          testnet: 'mock-testnet-address',
        },
      })

      expect(balance).toBe(1) // 1 STX
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`extended/v1/address/${mockAddress}/stx`),
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      )
    })

    it('should handle testnet network correctly', async () => {
      const testnetClient = new StacksClient(
        NetworkType.Testnet,
        STACKS_TESTNET_API_BASE_URL,
        STACKS_TESTNET_API_BASE_URL,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const mockBalance = 5000000 // 5 STX in microSTX
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: mockBalance }),
        text: async () => '',
      })

      const balance = await testnetClient.getBalance({
        index: 0,
        publicKey: 'mock-public-key',
        addresses: {
          mainnet: 'mock-mainnet-address',
          testnet: mockAddress,
        },
      })
      expect(balance).toBe(5)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.testnet.hiro.so'),
        expect.any(Object)
      )
    })
  })

  describe('sendStx', () => {
    it('should send STX successfully', async () => {
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(makeSTXTokenTransfer as jest.Mock).mockResolvedValueOnce(
        mockTransaction
      )
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.sendStx(
        mockPrivateKey,
        mockAddress,
        1.5,
        NetworkType.Mainnet,
        'Test memo'
      )

      expect(result).toBe(mockTxid)
      expect(makeSTXTokenTransfer).toHaveBeenCalledWith({
        recipient: mockAddress,
        amount: BigInt(1500000),
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        memo: 'Test memo',
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should send STX without memo', async () => {
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(makeSTXTokenTransfer as jest.Mock).mockResolvedValueOnce(
        mockTransaction
      )
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.sendStx(
        mockPrivateKey,
        mockAddress,
        2.0,
        NetworkType.Mainnet
      )

      expect(result).toBe(mockTxid)
      expect(makeSTXTokenTransfer).toHaveBeenCalledWith({
        recipient: mockAddress,
        amount: BigInt(2000000),
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        memo: undefined,
      })
    })
  })

  describe('transferNFT', () => {
    it('should transfer NFT successfully', async () => {
      const contractId = 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.contract-name'
      const tokenId = '123'
      const senderAddress = 'SP1111111111111111111111111111111111111111'
      const recipientAddress = 'SP2222222222222222222222222222222222222222'
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockTokenIdCV = { type: 'uint', value: BigInt(tokenId) }
      const mockSenderCV = { type: 'principal', address: senderAddress }
      const mockRecipientCV = { type: 'principal', address: recipientAddress }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockTokenIdCV)
      ;(standardPrincipalCV as jest.Mock)
        .mockReturnValueOnce(mockSenderCV)
        .mockReturnValueOnce(mockRecipientCV)
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.transferNFT(
        contractId,
        tokenId,
        mockPrivateKey,
        senderAddress,
        recipientAddress,
        NetworkType.Mainnet
      )

      expect(result).toBe(mockTxid)
      expect(uintCV).toHaveBeenCalledWith(tokenId)
      expect(standardPrincipalCV).toHaveBeenCalledWith(senderAddress)
      expect(standardPrincipalCV).toHaveBeenCalledWith(recipientAddress)
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress: 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        contractName: 'contract-name',
        functionName: 'transfer',
        functionArgs: [mockTokenIdCV, mockSenderCV, mockRecipientCV],
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: PostConditionMode.Allow,
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })
  })

  describe('transferFT', () => {
    it('should transfer fungible token successfully', async () => {
      const contractId = 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.contract-name'
      const amount = 1000
      const senderAddress = 'SP1111111111111111111111111111111111111111'
      const recipientAddress = 'SP2222222222222222222222222222222222222222'
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(amount) }
      const mockSenderCV = { type: 'principal', address: senderAddress }
      const mockRecipientCV = { type: 'principal', address: recipientAddress }
      const mockMemoCV = { type: 'none' }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockAmountCV)
      ;(standardPrincipalCV as jest.Mock)
        .mockReturnValueOnce(mockSenderCV)
        .mockReturnValueOnce(mockRecipientCV)
      ;(noneCV as jest.Mock).mockReturnValueOnce(mockMemoCV)
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.transferFT(
        contractId,
        amount,
        mockPrivateKey,
        senderAddress,
        recipientAddress,
        NetworkType.Mainnet
      )

      expect(result).toBe(mockTxid)
      expect(uintCV).toHaveBeenCalledWith(amount)
      expect(standardPrincipalCV).toHaveBeenCalledWith(senderAddress)
      expect(standardPrincipalCV).toHaveBeenCalledWith(recipientAddress)
      expect(noneCV).toHaveBeenCalled()
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress: 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        contractName: 'contract-name',
        functionName: 'transfer',
        functionArgs: [mockAmountCV, mockSenderCV, mockRecipientCV, mockMemoCV],
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: PostConditionMode.Allow,
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })
  })

  describe('makeContractCall', () => {
    it('should make contract call successfully with default postConditionMode', async () => {
      const contractAddress = 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const contractName = 'my-contract'
      const functionName = 'my-function'
      const mockUintCV = { type: 'uint', value: BigInt(100) } as ClarityValue
      const mockStringCV = {
        type: 'string',
        value: 'test',
      } as unknown as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV, mockStringCV]
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.makeContractCall(
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        mockPrivateKey
      )

      expect(result).toBe(mockTxid)
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: PostConditionMode.Deny,
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should make contract call with custom postConditionMode', async () => {
      const contractAddress = 'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const contractName = 'my-contract'
      const functionName = 'my-function'
      const mockUintCV = { type: 'uint', value: BigInt(200) } as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV]
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockUintCV)
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stacksClient.makeContractCall(
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        mockPrivateKey,
        PostConditionMode.Allow
      )

      expect(result).toBe(mockTxid)
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey: mockPrivateKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: PostConditionMode.Allow,
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should include network in broadcast options for devnet', async () => {
      const devnetClient = new StacksClient(
        NetworkType.Devnet,
        STACKS_API_BASE_URL,
        STACKS_TESTNET_API_BASE_URL,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const contractAddress = 'ST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const contractName = 'my-contract'
      const functionName = 'my-function'
      const mockUintCV = { type: 'uint', value: BigInt(300) } as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV]
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockUintCV)
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await devnetClient.makeContractCall(
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        mockPrivateKey
      )

      expect(result).toBe(mockTxid)
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        network: expect.objectContaining({
          chainId: expect.any(Number),
        }),
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })
  })
})
