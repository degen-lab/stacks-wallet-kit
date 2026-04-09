import { AuthError } from '@degenlab/stacks-wallet-kit-core'
import { GoogleSigninClient } from '../../../src/authentication/googleSignInClient'

const mockLaunchWebAuthFlow =  jest.fn()
const mockGetAuthToken = jest.fn()
const mockRemoveCachedAuthToken = jest.fn()
const mockChromeIdentity = {
  launchWebAuthFlow: mockLaunchWebAuthFlow,
  getAuthToken: mockGetAuthToken,
  removeCachedAuthToken: mockRemoveCachedAuthToken,
}

global.fetch = jest.fn() as jest.Mock

interface ChromeMock {
  identity: {
    launchWebAuthFlow: jest.Mock
    getAuthToken: jest.Mock
    removeCachedAuthToken: jest.Mock
  }
  runtime: {
    lastError: { message: string } | null
  }
  storage?: {
    local: {
      get: jest.Mock
      set: jest.Mock
      remove: jest.Mock
      clear: jest.Mock
    }
  }
}

const getChrome = (): ChromeMock => global.chrome as unknown as ChromeMock

Object.assign(global, {
  chrome: {
    ...(global.chrome || {}),
    identity: mockChromeIdentity,
    runtime: {
      lastError: null,
    },
  },
})

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

describe('Google client unit tests', () => {
  const googleClientId = 'test-client-id'
  const googleClientSecret = 'test-client-secret'
  const redirectUri = 'chrome-extension://test-extension-id/redirect.html'
  const scopes = ['https://www.googleapis.com/auth/drive.appdata']
  let googleClient: GoogleSigninClient

  beforeEach(() => {
    jest.clearAllMocks()
    getChrome().runtime.lastError = null
    googleClient = new GoogleSigninClient()
  })

  describe('getAccessToken', () => {
    const refreshToken = 'test-refresh-token'

    it('should get access token successfully', async () => {
      const mockResponse: { access_token: string; expires_in: number } = {
        access_token: 'new-access-token',
        expires_in: 3600,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      })

      const result = await googleClient.getAccessToken(
        googleClientId,
        googleClientSecret,
        refreshToken
      )

      expect(result).toBe('new-access-token')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams),
        })
      )
    })

    it('should throw error when token refresh fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('Invalid refresh token'),
      })

      await expect(
        googleClient.getAccessToken(
          googleClientId,
          googleClientSecret,
          refreshToken
        )
      ).rejects.toThrow('Token refresh failed: Invalid refresh token')
    })

    it('should include correct parameters in request', async () => {
      const mockResponse: { access_token: string; expires_in: number } = {
        access_token: 'new-access-token',
        expires_in: 3600,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      })

      await googleClient.getAccessToken(
        googleClientId,
        googleClientSecret,
        refreshToken
      )

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = fetchCall[1].body as URLSearchParams

      expect(body.get('client_id')).toBe(googleClientId)
      expect(body.get('client_secret')).toBe(googleClientSecret)
      expect(body.get('refresh_token')).toBe(refreshToken)
      expect(body.get('grant_type')).toBe('refresh_token')
    })
  })

  describe('loginWithGoogle', () => {
    const mockAuthCode = 'test-auth-code'
    const mockRedirectUrl = `${redirectUri}?code=${mockAuthCode}`
    const mockTokenResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    it('should login successfully and return access token', async () => {
      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(mockRedirectUrl)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      })

      const result = await googleClient.loginWithGoogle(
        googleClientId,
        googleClientSecret,
        redirectUri,
        scopes
      )

      expect(result).toEqual({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        idToken: '',
      })
      expect(mockLaunchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('accounts.google.com'),
          interactive: true,
        }),
        expect.any(Function)
      )
    })

    it('should build correct authentication URL', async () => {
      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(mockRedirectUrl)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      })

      await googleClient.loginWithGoogle(
        googleClientId,
        googleClientSecret,
        redirectUri,
        scopes
      )

      const authUrl = mockLaunchWebAuthFlow.mock.calls[0][0].url
      const url = new URL(authUrl)

      expect(url.searchParams.get('client_id')).toBe(googleClientId)
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
      expect(url.searchParams.get('scope')).toBe(scopes.join(' '))
      expect(url.searchParams.get('access_type')).toBe('offline')
      expect(url.searchParams.get('prompt')).toBe('consent')
    })

    it('should throw error when chrome.identity fails', async () => {
      getChrome().runtime.lastError = {
        message: 'Authentication failed',
      }

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(undefined)
          }
        }
      )

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toEqual({
        message: 'Authentication failed',
      })
    })

    it('should throw error when no redirect URL received', async () => {
      getChrome().runtime.lastError = null

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(undefined)
          }
        }
      )

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toThrow(AuthError)

      try {
        await googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('NO_REDIRECT_URL')
        }
      }
    })

    it('should throw error when user cancels authentication', async () => {
      const cancelRedirectUrl = `${redirectUri}?error=access_denied`

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(cancelRedirectUrl)
          }
        }
      )

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toThrow(AuthError)

      try {
        await googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('GOOGLE_AUTH_CANCELED')
        }
      }
    })

    it('should throw error when OAuth error occurs', async () => {
      const errorRedirectUrl = `${redirectUri}?error=invalid_request&error_description=Invalid+request`

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(errorRedirectUrl)
          }
        }
      )

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toThrow(AuthError)

      try {
        await googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('GOOGLE_AUTH_FAILED')
        }
      }
    })

    it('should throw error when no authorization code in redirect URL', async () => {
      const noCodeRedirectUrl = `${redirectUri}?state=test-state`

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(noCodeRedirectUrl)
          }
        }
      )

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toThrow(AuthError)

      try {
        await googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('AUTHORIZATION_CODE_NOT_FOUND')
        }
      }
    })

    it('should exchange authorization code for tokens', async () => {
      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(mockRedirectUrl)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      })

      await googleClient.loginWithGoogle(
        googleClientId,
        googleClientSecret,
        redirectUri,
        scopes
      )

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams),
        })
      )

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = fetchCall[1].body as URLSearchParams

      expect(body.get('client_id')).toBe(googleClientId)
      expect(body.get('client_secret')).toBe(googleClientSecret)
      expect(body.get('code')).toBe(mockAuthCode)
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('redirect_uri')).toBe(redirectUri)
    })

    it('should throw error when token exchange fails', async () => {
      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(mockRedirectUrl)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('Invalid authorization code'),
      })

      await expect(
        googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      ).rejects.toThrow(AuthError)

      try {
        await googleClient.loginWithGoogle(
          googleClientId,
          googleClientSecret,
          redirectUri,
          scopes
        )
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('TOKEN_EXCHANGE_FAILED')
        }
      }
    })

    it('should handle multiple scopes correctly', async () => {
      const multipleScopes = [
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/userinfo.email',
      ]

      mockLaunchWebAuthFlow.mockImplementation(
        (
          options: chrome.identity.WebAuthFlowOptions,
          callback?: (responseUrl?: string) => void
        ) => {
          if (callback) {
            callback(mockRedirectUrl)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      })

      await googleClient.loginWithGoogle(
        googleClientId,
        googleClientSecret,
        redirectUri,
        multipleScopes
      )

      const authUrl = mockLaunchWebAuthFlow.mock.calls[0][0].url
      const url = new URL(authUrl)

      expect(url.searchParams.get('scope')).toBe(multipleScopes.join(' '))
    })
  })

  describe('logOut', () => {
    it('should successfully log out and revoke token', async () => {
      const mockToken = 'mock-auth-token'
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(mockToken)
          }
        }
      )
      mockRemoveCachedAuthToken.mockImplementation(
        (details: chrome.identity.TokenInformation, callback?: () => void) => {
          if (callback) {
            callback()
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      await googleClient.logOut()

      expect(mockGetAuthToken).toHaveBeenCalledWith(
        { interactive: false },
        expect.any(Function)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(mockToken)
      )
      expect(mockRemoveCachedAuthToken).toHaveBeenCalledWith(
        { token: mockToken },
        expect.any(Function)
      )
    })

    it('should handle case when no token exists', async () => {
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(undefined)
          }
        }
      )

      await googleClient.logOut()

      expect(mockGetAuthToken).toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
      expect(mockRemoveCachedAuthToken).not.toHaveBeenCalled()
    })

    it('should handle getAuthToken errors', async () => {
      getChrome().runtime.lastError = {
        message: 'Failed to get token',
      }
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(undefined)
          }
        }
      )

      await expect(googleClient.logOut()).rejects.toEqual({
        message: 'Failed to get token',
      })
      getChrome().runtime.lastError = null
    })

    it('should handle revoke token fetch errors', async () => {
      const mockToken = 'mock-auth-token'
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(mockToken)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(googleClient.logOut()).rejects.toThrow(AuthError)
      try {
        await googleClient.logOut()
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('TOKEN_REVOCATION_FAILED')
          expect(error.message).toContain('Network error')
        }
      }
    })

    it('should handle revoke token fetch response errors', async () => {
      const mockToken = 'mock-auth-token'
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(mockToken)
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(googleClient.logOut()).rejects.toThrow(AuthError)
      try {
        await googleClient.logOut()
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('TOKEN_REVOCATION_FAILED')
          expect(error.message).toContain('400')
          expect(error.message).toContain('Bad Request')
        }
      }
    })

    it('should handle removeCachedAuthToken errors', async () => {
      const mockToken = 'mock-auth-token'
      mockGetAuthToken.mockImplementation(
        (
          details: chrome.identity.TokenDetails,
          callback?: (token?: string) => void
        ) => {
          if (callback) {
            callback(mockToken)
          }
        }
      )
      mockRemoveCachedAuthToken.mockImplementation(
        (details: chrome.identity.TokenInformation, callback?: () => void) => {
          if (callback) {
            getChrome().runtime.lastError = {
              message: 'Failed to remove token',
            }
            callback()
          }
        }
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      await expect(googleClient.logOut()).rejects.toEqual({
        message: 'Failed to remove token',
      })
      getChrome().runtime.lastError = null
    })
  })
})
