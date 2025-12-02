export type SignatureResponse = {
  method: string
  period: number
  rewardCycle: number
  maxAmount: number
  signerSignature: string
  signerKey: string
  authId: string
  poxAddress: string
}

export enum SignatureTopic {
  'stack-stx' = 'stack-stx',
  'stack-extend' = 'stack-extend',
  'stack-increase' = 'stack-increase',
}

export type StackingPool = {
  name: string
  address: string
}
