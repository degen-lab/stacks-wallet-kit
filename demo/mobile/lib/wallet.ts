import { Env } from '@/lib/env'
import { NetworkType } from '@degenlab/stacks-wallet-kit/core'
import { MobileClient } from '@degenlab/stacks-wallet-kit/mobile'
import { Platform } from 'react-native'

const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  // 'https://www.googleapis.com/auth/drive.appdata',
]

// Detect platform and set appropriate devnet URL
const getDevnetUrl = (): string => {
  if (Platform.OS === 'web') {
    // Web platform - use localhost
    return 'http://localhost:3999/'
  } else if (Platform.OS === 'android') {
    // Android emulator - use 10.0.2.2 (maps to host's localhost)
    return __DEV__ ? 'http://10.0.2.2:3999/' : 'http://192.168.68.104:3999/' // Physical device fallback
  } else {
    // iOS - use localhost (iOS simulator maps localhost correctly)
    return 'http://localhost:3999/'
  }
}

const DEVNET_API_URL = getDevnetUrl()

console.log('[SDK Config] Platform:', Platform.OS)
console.log('[SDK Config] Initializing SDK with devnet URL:', DEVNET_API_URL)

export const walletKit = new MobileClient(
  Env.GOOGLE_WEB_CLIENT_ID,
  Env.GOOGLE_IOS_CLIENT_ID,
  NetworkType.Devnet,
  {
    scopes: GOOGLE_SCOPES,
    devnetUrl: DEVNET_API_URL,
  }
)

