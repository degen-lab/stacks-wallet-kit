import {
  broadcastTransaction,
  bufferCV,
  makeContractCall,
  noneCV,
  principalCV,
  someCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions'
import {
  StackingClient,
  NetworkType,
  STACKS_WEB_DEVNET_API_BASE_URL,
} from '../../../src'
import {
  SignatureResponse,
  SignatureTopic,
  StackingPool,
} from '../../../src/stacks/utils/types'
import {
  btcAddressToPoxAddress,
  stxToUstx,
} from '../../../src/stacks/utils/walletHelpers'
import { SIGNATURE_ENDPOINT } from '../../../src/stacks/utils/constants'

// Mock fetch globally
global.fetch = jest.fn()

// Mock helper functions
jest.mock('../../../src/stacks/utils/walletHelpers', () => ({
  btcAddressToPoxAddress: jest.fn(),
  stxToUstx: jest.fn(),
}))

describe('StackingClient Unit Tests', () => {
  let stackingClient: StackingClient
  const mockSenderKey = 'ed25519-private-key'
  const mockTxid = '0x1234567890abcdef'
  const mockPool: StackingPool = {
    name: 'Test Pool',
    address: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP',
  }
  const mockBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  const mockBtcTestnetAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
  const mockBtcAddresses = {
    mainnet: mockBtcAddress,
    testnet: mockBtcTestnetAddress,
  }
  const mockVersion = '00'
  const mockHashBytes = 'a'.repeat(64) // 32 bytes in hex

  beforeEach(() => {
    jest.clearAllMocks()
    stackingClient = new StackingClient(
      NetworkType.Mainnet,
      STACKS_WEB_DEVNET_API_BASE_URL
    )
    ;(btcAddressToPoxAddress as jest.Mock).mockReturnValue({
      version: mockVersion,
      hashBytes: mockHashBytes,
    })
    ;(stxToUstx as jest.Mock).mockImplementation((stx: number) =>
      BigInt(stx * 1_000_000)
    )
  })

  describe('delegateStx', () => {
    it('should delegate STX successfully with all options', async () => {
      const amount = 100
      const untilBurnHeight = 100000
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(100_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }
      const mockUntilBurnHeightCV = {
        type: 'uint',
        value: BigInt(untilBurnHeight),
      }
      const mockPoxAddressCV = {
        type: 'tuple',
        data: {
          version: { type: 'buffer', buffer: Buffer.from(mockVersion, 'hex') },
          hashbytes: {
            type: 'buffer',
            buffer: Buffer.from(mockHashBytes, 'hex'),
          },
        },
      }

      ;(uintCV as jest.Mock)
        .mockReturnValueOnce(mockAmountCV)
        .mockReturnValueOnce(mockUntilBurnHeightCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce(mockPoxAddressCV)
      ;(someCV as jest.Mock)
        .mockReturnValueOnce({ type: 'some', value: mockUntilBurnHeightCV })
        .mockReturnValueOnce({ type: 'some', value: mockPoxAddressCV })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.delegateStx(
        mockSenderKey,
        mockPool,
        amount,
        {
          untilBurnHeight,
          btcAddresses: mockBtcAddresses,
        }
      )

      expect(result).toBe(mockTxid)
      expect(stxToUstx).toHaveBeenCalledWith(amount)
      expect(principalCV).toHaveBeenCalledWith(mockPool.address)
      expect(uintCV).toHaveBeenCalledWith(BigInt(100_000_000))
      expect(uintCV).toHaveBeenCalledWith(untilBurnHeight)
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress: 'SP000000000000000000002Q6VF78',
        contractName: 'pox-4',
        functionName: 'delegate-stx',
        functionArgs: expect.arrayContaining([
          mockAmountCV,
          mockAddressCV,
          expect.any(Object), // someCV(untilBurnHeightCV)
          expect.any(Object), // someCV(poxAddressCV)
        ]),
        senderKey: mockSenderKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: expect.any(String),
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should delegate STX successfully without options', async () => {
      const amount = 50
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(50_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockAmountCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(noneCV as jest.Mock)
        .mockReturnValueOnce({ type: 'none' })
        .mockReturnValueOnce({ type: 'none' })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.delegateStx(
        mockSenderKey,
        mockPool,
        amount
      )

      expect(result).toBe(mockTxid)
      expect(stxToUstx).toHaveBeenCalledWith(amount)
      expect(btcAddressToPoxAddress).not.toHaveBeenCalled()
      expect(noneCV).toHaveBeenCalledTimes(2)
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'delegate-stx',
          functionArgs: expect.arrayContaining([
            mockAmountCV,
            mockAddressCV,
            expect.any(Object),
            expect.any(Object),
          ]),
        })
      )
    })

    it('should delegate STX successfully with only untilBurnHeight', async () => {
      const amount = 75
      const untilBurnHeight = 200000
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(75_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }
      const mockUntilBurnHeightCV = {
        type: 'uint',
        value: BigInt(untilBurnHeight),
      }

      ;(uintCV as jest.Mock)
        .mockReturnValueOnce(mockAmountCV)
        .mockReturnValueOnce(mockUntilBurnHeightCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(someCV as jest.Mock).mockReturnValueOnce({
        type: 'some',
        value: mockUntilBurnHeightCV,
      })
      ;(noneCV as jest.Mock).mockReturnValueOnce({ type: 'none' })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.delegateStx(
        mockSenderKey,
        mockPool,
        amount,
        {
          untilBurnHeight,
        }
      )

      expect(result).toBe(mockTxid)
      expect(btcAddressToPoxAddress).not.toHaveBeenCalled()
      expect(noneCV).toHaveBeenCalledTimes(1)
    })

    it('should delegate STX successfully with only btcAddresses', async () => {
      const amount = 200
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(200_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockAmountCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce({
        type: 'tuple',
        data: { version: {}, hashbytes: {} },
      })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(noneCV as jest.Mock).mockReturnValueOnce({ type: 'none' })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.delegateStx(
        mockSenderKey,
        mockPool,
        amount,
        {
          btcAddresses: mockBtcAddresses,
        }
      )

      expect(result).toBe(mockTxid)
      expect(noneCV).toHaveBeenCalledTimes(1)
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          network: expect.objectContaining({
            chainId: 1,
            bootAddress: 'SP000000000000000000002Q6VF78',
          }),
        })
      )
    })

    it('should use testnet Bitcoin address when network is testnet and btcAddresses provided', async () => {
      const testnetClient = new StackingClient(
        NetworkType.Testnet,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const amount = 200
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(200_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockAmountCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce({
        type: 'tuple',
        data: { version: {}, hashbytes: {} },
      })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(noneCV as jest.Mock).mockReturnValueOnce({ type: 'none' })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await testnetClient.delegateStx(
        mockSenderKey,
        mockPool,
        amount,
        {
          btcAddresses: mockBtcAddresses,
        }
      )

      expect(result).toBe(mockTxid)
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: 'ST000000000000000000002AMW42H',
          network: expect.objectContaining({
            chainId: 2147483648,
            bootAddress: 'ST000000000000000000002AMW42H',
          }),
        })
      )
    })

    it('should use testnet contract address when network is testnet', async () => {
      const testnetClient = new StackingClient(
        NetworkType.Testnet,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const amount = 100
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }
      const mockAmountCV = { type: 'uint', value: BigInt(100_000_000) }
      const mockAddressCV = { type: 'principal', address: mockPool.address }

      ;(uintCV as jest.Mock).mockReturnValueOnce(mockAmountCV)
      ;(principalCV as jest.Mock).mockReturnValueOnce(mockAddressCV)
      ;(noneCV as jest.Mock)
        .mockReturnValueOnce({ type: 'none' })
        .mockReturnValueOnce({ type: 'none' })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      await testnetClient.delegateStx(mockSenderKey, mockPool, amount)

      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: 'ST000000000000000000002AMW42H',
          network: expect.objectContaining({
            chainId: 2147483648,
            bootAddress: 'ST000000000000000000002AMW42H',
          }),
        })
      )
    })
  })

  describe('revokeDelegation', () => {
    it('should revoke delegation successfully on mainnet', async () => {
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.revokeDelegation(mockSenderKey)

      expect(result).toBe(mockTxid)
      expect(makeContractCall).toHaveBeenCalledWith({
        contractAddress: 'SP000000000000000000002Q6VF78',
        contractName: 'pox-4',
        functionName: 'revoke-delegate-stx',
        functionArgs: [],
        senderKey: mockSenderKey,
        network: expect.objectContaining({
          chainId: 1,
          bootAddress: 'SP000000000000000000002Q6VF78',
        }),
        postConditionMode: expect.any(String),
      })
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should revoke delegation successfully on testnet', async () => {
      const testnetClient = new StackingClient(
        NetworkType.Testnet,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await testnetClient.revokeDelegation(mockSenderKey)

      expect(result).toBe(mockTxid)
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: 'ST000000000000000000002AMW42H',
          network: expect.objectContaining({
            chainId: 2147483648,
            bootAddress: 'ST000000000000000000002AMW42H',
          }),
        })
      )
    })
  })

  describe('stackExtend', () => {
    it('should extend stacking successfully', async () => {
      const rewardCycle = 10
      const extendCount = 3
      const maxAmount = 1000
      const mockSignerData: SignatureResponse = {
        method: 'stack-extend',
        period: extendCount,
        rewardCycle,
        maxAmount: 1000_000_000, // in uSTX
        signerSignature: 'a'.repeat(130), // 65 bytes in hex
        signerKey:
          '0284df4505c6318a0017a7848aa0a95bf8cd3db697a89d2ec1978a027bece770ef',
        authId: '123',
        poxAddress: mockBtcAddress,
      }
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignerData,
      })
      ;(uintCV as jest.Mock)
        .mockReturnValueOnce({ type: 'uint', value: BigInt(extendCount) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.maxAmount),
        })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.authId),
        })
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerSignature, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerKey, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce({
        type: 'tuple',
        data: { version: {}, hashbytes: {} },
      })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.stackExtend(
        mockSenderKey,
        rewardCycle,
        extendCount,
        mockBtcAddresses,
        maxAmount
      )

      expect(result).toBe(mockTxid)
      expect(global.fetch).toHaveBeenCalledWith(SIGNATURE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardCycle,
          poxAddress: mockBtcAddress, // Should use mainnet address for mainnet network
          maxAmount,
          period: extendCount,
          topic: SignatureTopic['stack-extend'],
          network: NetworkType.Mainnet,
        }),
      })
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stack-extend',
          contractAddress: 'SP000000000000000000002Q6VF78',
          network: expect.objectContaining({
            chainId: 1,
            bootAddress: 'SP000000000000000000002Q6VF78',
          }),
        })
      )
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should throw error if signature generation fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error message',
      })

      await expect(
        stackingClient.stackExtend(mockSenderKey, 10, 3, mockBtcAddresses, 1000)
      ).rejects.toThrow('Failed to sign transaction')
    })
  })

  describe('stackStx', () => {
    it('should stack STX successfully', async () => {
      const rewardCycle = 5
      const amount = 500
      const startBurnHeight = 100000
      const period = 6
      const maxAmount = 1000
      const mockSignerData: SignatureResponse = {
        method: 'stack-stx',
        period,
        rewardCycle,
        maxAmount: 1000_000_000, // in uSTX
        signerSignature: 'b'.repeat(130),
        signerKey:
          '0284df4505c6318a0017a7848aa0a95bf8cd3db697a89d2ec1978a027bece770ef',
        authId: '456',
        poxAddress: mockBtcAddress,
      }
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignerData,
      })
      ;(uintCV as jest.Mock)
        .mockReturnValueOnce({ type: 'uint', value: BigInt(500_000_000) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.maxAmount),
        })
        .mockReturnValueOnce({ type: 'uint', value: BigInt(startBurnHeight) })
        .mockReturnValueOnce({ type: 'uint', value: BigInt(period) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.authId),
        })
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerSignature, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerKey, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce({
        type: 'tuple',
        data: { version: {}, hashbytes: {} },
      })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.stackStx(
        mockSenderKey,
        rewardCycle,
        amount,
        mockBtcAddresses,
        startBurnHeight,
        period,
        maxAmount
      )

      expect(result).toBe(mockTxid)
      expect(stxToUstx).toHaveBeenCalledWith(amount)
      expect(global.fetch).toHaveBeenCalledWith(SIGNATURE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardCycle,
          poxAddress: mockBtcAddress, // Should use mainnet address for mainnet network
          maxAmount,
          period,
          topic: SignatureTopic['stack-stx'],
          network: NetworkType.Mainnet,
        }),
      })
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stack-stx',
        })
      )
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })

    it('should use testnet Bitcoin address when network is testnet', async () => {
      const testnetClient = new StackingClient(
        NetworkType.Testnet,
        STACKS_WEB_DEVNET_API_BASE_URL
      )
      const rewardCycle = 5
      const amount = 500
      const startBurnHeight = 100000
      const period = 6
      const maxAmount = 1000
      const mockSignerData: SignatureResponse = {
        method: 'stack-stx',
        period,
        rewardCycle,
        maxAmount: 1000_000_000,
        signerSignature: 'b'.repeat(130),
        signerKey:
          '0284df4505c6318a0017a7848aa0a95bf8cd3db697a89d2ec1978a027bece770ef',
        authId: '456',
        poxAddress: mockBtcTestnetAddress,
      }
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignerData,
      })
      ;(uintCV as jest.Mock)
        .mockReturnValueOnce({ type: 'uint', value: BigInt(500_000_000) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.maxAmount),
        })
        .mockReturnValueOnce({ type: 'uint', value: BigInt(startBurnHeight) })
        .mockReturnValueOnce({ type: 'uint', value: BigInt(period) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.authId),
        })
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockVersion, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockHashBytes, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerSignature, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerKey, 'hex'),
        })
      ;(tupleCV as jest.Mock).mockReturnValueOnce({
        type: 'tuple',
        data: { version: {}, hashbytes: {} },
      })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await testnetClient.stackStx(
        mockSenderKey,
        rewardCycle,
        amount,
        mockBtcAddresses,
        startBurnHeight,
        period,
        maxAmount
      )

      expect(result).toBe(mockTxid)
      expect(global.fetch).toHaveBeenCalledWith(SIGNATURE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardCycle,
          poxAddress: mockBtcTestnetAddress, // Should use testnet address for testnet network
          maxAmount,
          period,
          topic: SignatureTopic['stack-stx'],
          network: NetworkType.Testnet,
        }),
      })
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: 'ST000000000000000000002AMW42H',
          network: expect.objectContaining({
            chainId: 2147483648,
          }),
        })
      )
    })
  })

  describe('stackIncrease', () => {
    it('should increase stacking successfully', async () => {
      const rewardCycle = 8
      const increaseBy = 200
      const maxAmount = 2000
      const currentLockPeriod = 4
      const mockSignerData: SignatureResponse = {
        method: 'stack-increase',
        period: currentLockPeriod,
        rewardCycle,
        maxAmount: 2000_000_000, // in uSTX
        signerSignature: 'c'.repeat(130),
        signerKey:
          '0284df4505c6318a0017a7848aa0a95bf8cd3db697a89d2ec1978a027bece770ef',
        authId: '789',
        poxAddress: mockBtcAddress,
      }
      const mockTransaction = { txid: mockTxid }
      const mockBroadcastResponse = { txid: mockTxid }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignerData,
      })
      ;(stxToUstx as jest.Mock).mockReturnValueOnce(BigInt(200_000_000))
      ;(uintCV as jest.Mock)
        .mockReturnValueOnce({ type: 'uint', value: BigInt(200_000_000) })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.maxAmount),
        })
        .mockReturnValueOnce({
          type: 'uint',
          value: BigInt(mockSignerData.authId),
        })
      ;(bufferCV as jest.Mock)
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerSignature, 'hex'),
        })
        .mockReturnValueOnce({
          type: 'buffer',
          buffer: Buffer.from(mockSignerData.signerKey, 'hex'),
        })
      ;(someCV as jest.Mock).mockReturnValueOnce({ type: 'some', value: {} })
      ;(makeContractCall as jest.Mock).mockResolvedValueOnce(mockTransaction)
      ;(broadcastTransaction as jest.Mock).mockResolvedValueOnce(
        mockBroadcastResponse
      )

      const result = await stackingClient.stackIncrease(
        mockSenderKey,
        rewardCycle,
        mockBtcAddresses,
        increaseBy,
        maxAmount,
        currentLockPeriod
      )

      expect(result).toBe(mockTxid)
      expect(stxToUstx).toHaveBeenCalledWith(increaseBy)
      expect(global.fetch).toHaveBeenCalledWith(SIGNATURE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardCycle,
          poxAddress: mockBtcAddress, // Should use mainnet address for mainnet network
          maxAmount,
          period: currentLockPeriod,
          topic: SignatureTopic['stack-increase'],
          network: NetworkType.Mainnet,
        }),
      })
      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stack-increase',
          network: expect.objectContaining({
            chainId: 1,
            bootAddress: 'SP000000000000000000002Q6VF78',
          }),
        })
      )
      expect(broadcastTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        client: expect.objectContaining({
          fetch: expect.any(Function),
        }),
      })
    })
  })
})
