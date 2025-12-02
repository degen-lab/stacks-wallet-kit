import { AuthError, IStorageManager } from '@google-wallet-sdk/core'
import { AuthenticationManager } from '../../../src/authentication/authenticationManager'
import { IGoogleSignInClient } from '../../../src/interfaces/IGoogleSignInClient'

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

describe('Authentication manager unit tests', () => {
  const googleClientId = 'test-client-id'
  const googleClientSecret = 'test-client-secret'
  const redirectUri = 'chrome-extension://test-extension-id/redirect.html'
  const scopes = ['https://www.googleapis.com/auth/drive.appdata']
  const refreshToken = 'test-refresh-token'
  const accessToken = 'test-access-token'
  const storageManager: IStorageManager = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  let mockGoogleSignInClient: jest.Mocked<IGoogleSignInClient>
  let authenticationManager: AuthenticationManager

  beforeEach(() => {
    jest.clearAllMocks()

    mockGoogleSignInClient = {
      loginWithGoogle: jest.fn(),
      getAccessToken: jest.fn(),
      logOut: jest.fn(),
    }

    authenticationManager = new AuthenticationManager(
      mockGoogleSignInClient,
      googleClientId,
      googleClientSecret,
      redirectUri,
      scopes,
      storageManager
    )
  })

  describe('signIn', () => {
    it('should successfully sign in and return access token', async () => {
      mockGoogleSignInClient.loginWithGoogle.mockResolvedValueOnce({
        accessToken,
        refreshToken,
      })

      const result = await authenticationManager.signIn()

      expect(result).toBe(accessToken)
      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenCalledWith(
        googleClientId,
        googleClientSecret,
        redirectUri,
        scopes
      )
      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenCalledTimes(1)
      expect(storageManager.setItem).toHaveBeenCalledWith(
        'refreshToken',
        refreshToken
      )
    })

    it('should pass correct parameters to loginWithGoogle', async () => {
      const customScopes = ['scope1', 'scope2']
      const customManager = new AuthenticationManager(
        mockGoogleSignInClient,
        googleClientId,
        googleClientSecret,
        redirectUri,
        customScopes,
        storageManager
      )

      mockGoogleSignInClient.loginWithGoogle.mockResolvedValueOnce({
        accessToken,
        refreshToken,
      })

      await customManager.signIn()

      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenCalledWith(
        googleClientId,
        googleClientSecret,
        redirectUri,
        customScopes
      )
    })

    it('should propagate errors from loginWithGoogle', async () => {
      const error = new AuthError('Authentication failed', 'AUTH_FAILED')
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(error)

      await expect(authenticationManager.signIn()).rejects.toThrow(AuthError)
    })

    it('should propagate AuthError with correct code from loginWithGoogle', async () => {
      const error = new AuthError('Authentication failed', 'AUTH_FAILED')
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(error)

      try {
        await authenticationManager.signIn()
      } catch (e) {
        if (isAuthError(e)) {
          expect(e.code).toBe('AUTH_FAILED')
        }
      }
    })

    it('should handle network errors from loginWithGoogle', async () => {
      const networkError = new Error('Network error')
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(networkError)

      await expect(authenticationManager.signIn()).rejects.toThrow(
        'Network error'
      )
    })

    it('should handle user cancellation errors', async () => {
      const cancelError = new AuthError(
        'User cancelled authentication',
        'GOOGLE_AUTH_CANCELED'
      )
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(cancelError)

      try {
        await authenticationManager.signIn()
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('GOOGLE_AUTH_CANCELED')
        }
      }
    })
  })

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockGoogleSignInClient.logOut.mockResolvedValueOnce(undefined)

      await authenticationManager.signOut()

      expect(mockGoogleSignInClient.logOut).toHaveBeenCalledTimes(1)
      expect(mockGoogleSignInClient.logOut).toHaveBeenCalledWith()
    })

    it('should propagate errors from logOut', async () => {
      const error = new Error('Logout failed')
      mockGoogleSignInClient.logOut.mockRejectedValueOnce(error)

      await expect(authenticationManager.signOut()).rejects.toThrow(
        'Logout failed'
      )
    })

    it('should handle chrome.identity errors during logout', async () => {
      const chromeError = new Error('Chrome identity error')
      mockGoogleSignInClient.logOut.mockRejectedValueOnce(chromeError)

      await expect(authenticationManager.signOut()).rejects.toThrow(
        'Chrome identity error'
      )
    })
  })

  describe('getAccessToken', () => {
    it('should successfully get access token using refresh token', async () => {
      const newAccessToken = 'new-access-token'
      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(
        newAccessToken
      )

      const result = await authenticationManager.getAccessToken(refreshToken)

      expect(result).toBe(newAccessToken)
      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledWith(
        googleClientId,
        googleClientSecret,
        refreshToken
      )
      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledTimes(1)
    })

    it('should pass correct parameters to getAccessToken', async () => {
      const customRefreshToken = 'custom-refresh-token'
      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(accessToken)

      await authenticationManager.getAccessToken(customRefreshToken)

      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledWith(
        googleClientId,
        googleClientSecret,
        customRefreshToken
      )
    })

    it('should propagate errors from getAccessToken', async () => {
      const error = new Error('Token refresh failed')
      mockGoogleSignInClient.getAccessToken.mockRejectedValueOnce(error)

      await expect(
        authenticationManager.getAccessToken(refreshToken)
      ).rejects.toThrow('Token refresh failed')
    })

    it('should handle invalid refresh token errors', async () => {
      const error = new Error('Token refresh failed: invalid_grant')
      mockGoogleSignInClient.getAccessToken.mockRejectedValueOnce(error)

      await expect(
        authenticationManager.getAccessToken('invalid-token')
      ).rejects.toThrow('invalid_grant')
    })

    it('should handle expired refresh token errors', async () => {
      const error = new Error('Token refresh failed: token_expired')
      mockGoogleSignInClient.getAccessToken.mockRejectedValueOnce(error)

      await expect(
        authenticationManager.getAccessToken(refreshToken)
      ).rejects.toThrow('token_expired')
    })
  })

  describe('signInSilently', () => {
    it('should successfully sign in silently with refresh token', async () => {
      const newAccessToken = 'new-access-token'
      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(
        newAccessToken
      )

      const result = await authenticationManager.signInSilently(refreshToken)

      expect(result).toBe(newAccessToken)
      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledWith(
        googleClientId,
        googleClientSecret,
        refreshToken
      )
      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledTimes(1)
    })

    it('should throw AuthError when refresh token is not provided', async () => {
      await expect(authenticationManager.signInSilently()).rejects.toThrow(
        AuthError
      )

      try {
        await authenticationManager.signInSilently()
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('REFRESH_TOKEN_REQUIRED')
          expect(error.message).toBe('Refresh token is required')
        }
      }

      expect(mockGoogleSignInClient.getAccessToken).not.toHaveBeenCalled()
    })

    it('should throw AuthError when refresh token is empty string', async () => {
      await expect(authenticationManager.signInSilently('')).rejects.toThrow(
        AuthError
      )

      try {
        await authenticationManager.signInSilently('')
      } catch (error) {
        if (isAuthError(error)) {
          expect(error.code).toBe('REFRESH_TOKEN_REQUIRED')
        }
      }

      expect(mockGoogleSignInClient.getAccessToken).not.toHaveBeenCalled()
    })

    it('should propagate errors from getAccessToken', async () => {
      const error = new Error('Token refresh failed')
      mockGoogleSignInClient.getAccessToken.mockRejectedValueOnce(error)

      await expect(
        authenticationManager.signInSilently(refreshToken)
      ).rejects.toThrow('Token refresh failed')
    })

    it('should handle AuthError from getAccessToken', async () => {
      const error = new AuthError(
        'Token exchange failed',
        'TOKEN_EXCHANGE_FAILED'
      )
      mockGoogleSignInClient.getAccessToken.mockRejectedValueOnce(error)

      try {
        await authenticationManager.signInSilently(refreshToken)
      } catch (e) {
        if (isAuthError(e)) {
          expect(e.code).toBe('TOKEN_EXCHANGE_FAILED')
        }
      }
    })

    it('should use correct client credentials for silent sign in', async () => {
      const customClientId = 'custom-client-id'
      const customClientSecret = 'custom-client-secret'
      const customManager = new AuthenticationManager(
        mockGoogleSignInClient,
        customClientId,
        customClientSecret,
        redirectUri,
        scopes,
        storageManager
      )

      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(accessToken)

      await customManager.signInSilently(refreshToken)

      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledWith(
        customClientId,
        customClientSecret,
        refreshToken
      )
    })
  })

  describe('Integration scenarios', () => {
    it('should handle full authentication flow: sign in -> get token -> sign out', async () => {
      // Sign in
      mockGoogleSignInClient.loginWithGoogle.mockResolvedValueOnce({
        accessToken,
        refreshToken,
      })
      const signInResult = await authenticationManager.signIn()
      expect(signInResult).toBe(accessToken)

      // Get new access token
      const newAccessToken = 'new-access-token'
      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(
        newAccessToken
      )
      const tokenResult =
        await authenticationManager.getAccessToken(refreshToken)
      expect(tokenResult).toBe(newAccessToken)

      // Sign out
      mockGoogleSignInClient.logOut.mockResolvedValueOnce(undefined)
      await authenticationManager.signOut()

      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenCalledTimes(1)
      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledTimes(1)
      expect(mockGoogleSignInClient.logOut).toHaveBeenCalledTimes(1)
    })

    it('should handle silent sign in after initial sign in', async () => {
      // Initial sign in
      mockGoogleSignInClient.loginWithGoogle.mockResolvedValueOnce({
        accessToken,
        refreshToken,
      })
      await authenticationManager.signIn()

      // Silent sign in with refresh token
      const newAccessToken = 'new-access-token'
      mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(
        newAccessToken
      )
      const silentResult =
        await authenticationManager.signInSilently(refreshToken)
      expect(silentResult).toBe(newAccessToken)
    })

    it('should handle multiple token refreshes', async () => {
      const tokens = ['token1', 'token2', 'token3']
      for (const token of tokens) {
        mockGoogleSignInClient.getAccessToken.mockResolvedValueOnce(token)
      }

      for (const expectedToken of tokens) {
        const result = await authenticationManager.getAccessToken(refreshToken)
        expect(result).toBe(expectedToken)
      }

      expect(mockGoogleSignInClient.getAccessToken).toHaveBeenCalledTimes(3)
    })

    it('should maintain separate instances with different configurations', async () => {
      const manager1 = new AuthenticationManager(
        mockGoogleSignInClient,
        'client-id-1',
        'client-secret-1',
        'redirect-uri-1',
        ['scope1'],
        storageManager
      )
      const manager2 = new AuthenticationManager(
        mockGoogleSignInClient,
        'client-id-2',
        'client-secret-2',
        'redirect-uri-2',
        ['scope2'],
        storageManager
      )

      mockGoogleSignInClient.loginWithGoogle
        .mockResolvedValueOnce({
          accessToken,
          refreshToken,
        })
        .mockResolvedValueOnce({
          accessToken,
          refreshToken,
        })

      await manager1.signIn()
      await manager2.signIn()

      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenNthCalledWith(
        1,
        'client-id-1',
        'client-secret-1',
        'redirect-uri-1',
        ['scope1']
      )
      expect(mockGoogleSignInClient.loginWithGoogle).toHaveBeenNthCalledWith(
        2,
        'client-id-2',
        'client-secret-2',
        'redirect-uri-2',
        ['scope2']
      )
    })
  })

  describe('Error handling', () => {
    it('should not leak sensitive information in error messages', async () => {
      const error = new Error('Authentication failed')
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(error)

      try {
        await authenticationManager.signIn()
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        expect(errorMessage).not.toContain(googleClientSecret)
        expect(errorMessage).not.toContain(refreshToken)
      }
    })

    it('should handle undefined errors gracefully', async () => {
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(undefined)

      await expect(authenticationManager.signIn()).rejects.toBeUndefined()
    })

    it('should handle null errors gracefully', async () => {
      mockGoogleSignInClient.loginWithGoogle.mockRejectedValueOnce(null)

      await expect(authenticationManager.signIn()).rejects.toBeNull()
    })
  })
})
