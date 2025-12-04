import { StackingPool } from './types'

export const STACKS_API_BASE_URL = 'https://api.hiro.so/'
export const STACKS_TESTNET_API_BASE_URL = 'https://api.testnet.hiro.so/'
export const STACKS_WEB_DEVNET_API_BASE_URL = 'http://localhost:3999/'
export const STACKS_MOBILE_DEVNET_API_BASE_URL = 'http://10.0.2.2:3999/'

export const GET_POX_INF0 = `v2/pox`
export const GET_BALANCE = (address: string) =>
  `extended/v1/address/${address}/stx`

export const TRANSFER_FUNCTION_NAME = 'transfer'

export const SIGNATURE_ENDPOINT = 'https://services.degenlab.io/get-signature'

export const MAINNET_SIGNER_PUB_KEY =
  '0284df4505c6318a0017a7848aa0a95bf8cd3db697a89d2ec1978a027bece770ef'

export const TESTNET_SIGNER_PUB_KEY =
  '02778d476704afa540ac01438f62c371dc38741b00f35fb895e5cd48d070ebab41'

export const MAINNET_POX_ADDRESS = 'SP000000000000000000002Q6VF78'

export const TESTNET_POX_ADDRESS = 'ST000000000000000000002AMW42H'

export const stackingPools: Map<string, StackingPool> = new Map<
  string,
  StackingPool
>([
  [
    'Friedger',
    {
      name: 'Friedger',
      address: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3',
    },
  ],
])
