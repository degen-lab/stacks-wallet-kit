import { StackingPool } from '../../stacks/utils/types'
import { NetworkType } from '../types/backupTypes'

export interface IStackingClient {
  // Solo stacking
  stackStx(
    senderKey: string,
    rewardCycle: number,
    amount: number,
    btcAddress: { mainnet: string; testnet: string },
    startBurnHeight: number,
    period: number,
    maxAmount: number
  ): Promise<string>
  stackExtend(
    senderKey: string,
    rewardCycle: number,
    extendCount: number,
    btcAddress: { mainnet: string; testnet: string },
    maxAmount: number
  ): Promise<string>
  stackIncrease(
    senderKey: string,
    rewardCycle: number,
    btcAddress: { mainnet: string; testnet: string },
    increaseBy: number,
    maxAmount: number,
    currentLockPeriod: number
  ): Promise<string>
  // Stacking with a pool
  delegateStx(
    senderKey: string,
    pool: StackingPool,
    amount: number,
    options?: {
      untilBurnHeight?: number
      btcAddresses?: { mainnet: string; testnet: string }
    }
  ): Promise<string>
  revokeDelegation(senderKey: string): Promise<string>
  setNetwork(network: NetworkType): void
}
