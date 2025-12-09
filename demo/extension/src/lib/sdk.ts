import { NetworkType } from '@degenlab/stacks-wallet-kit/core'
import { WebClient } from '@degenlab/stacks-wallet-kit/extension'

const GOOGLE_SCOPES: string[] = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.appdata',
]

// Devnet URL configuration for extension
const DEVNET_API_URL = 'http://localhost:3999/'

const stacksConfig = {
  scopes: GOOGLE_SCOPES,
  devnetUrl: DEVNET_API_URL,
}

console.log('[SDK Config] Initializing SDK with devnet URL:', DEVNET_API_URL)
console.log('[SDK Config] Full stacksConfig:', stacksConfig)

// Get Google OAuth credentials from environment or use defaults
// In a real extension, these would be set via environment variables or extension options
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = chrome.identity.getRedirectURL()

console.log(
  '[SDK Config] Google Client ID:',
  GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 30)}...` : 'NOT SET'
)
console.log(
  '[SDK Config] Google Client Secret:',
  GOOGLE_CLIENT_SECRET ? '***set***' : 'NOT SET'
)
console.log('[SDK Config] Redirect URI:', REDIRECT_URI)

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    '[SDK Config] WARNING: Google OAuth credentials are not set. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
  )
}

let sdkFacadeInstance: WebClient | null = null

export function initializeSDK(): WebClient {
  if (sdkFacadeInstance) {
    return sdkFacadeInstance
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    )
  }

  try {
    sdkFacadeInstance = new WebClient(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI,
      NetworkType.Devnet,
      stacksConfig
    )
    console.log('[SDK] Successfully initialized SDK')
    return sdkFacadeInstance
  } catch (error) {
    console.error('[SDK] Failed to initialize SDK:', error)
    throw error
  }
}

export function getSDK(): WebClient | null {
  return sdkFacadeInstance
}

export function resetSDK(): void {
  sdkFacadeInstance = null
  console.log('[SDK] SDK instance reset')
}

export const sdkFacade = sdkFacadeInstance
