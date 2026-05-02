import { Env } from '@/lib/env'
import { NetworkType } from '@degenlab/stacks-wallet-kit-core'
import { MobileClient } from '@degenlab/stacks-wallet-kit-mobile'
import { Platform } from 'react-native'

const GOOGLE_SCOPES = ['openid', 'profile', 'email']

const getDevnetUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3999/'
  }
  return 'http://localhost:3999/'
}

export const walletKit = new MobileClient({
  google: {
    webClientId: Env.GOOGLE_WEB_CLIENT_ID,
    iosClientId: Env.GOOGLE_IOS_CLIENT_ID,
    scopes: GOOGLE_SCOPES,
  },
  network: NetworkType.Devnet,
  devnetUrl: getDevnetUrl(),
})
