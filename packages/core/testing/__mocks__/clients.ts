import { IStacksClient, IStackingClient } from '../../src'

export const stacksClient: IStacksClient = {
  getBalance: jest.fn(),
  sendStx: jest.fn(),
  transferNFT: jest.fn(),
  transferFT: jest.fn(),
  getPoxData: jest.fn(),
  setNetwork: jest.fn(),
  makeContractCall: jest.fn(),
  signTranasction: jest.fn(),
}

export const stackingClient: IStackingClient = {
  stackStx: jest.fn(),
  stackExtend: jest.fn(),
  stackIncrease: jest.fn(),
  delegateStx: jest.fn(),
  revokeDelegation: jest.fn(),
  setNetwork: jest.fn(),
}
