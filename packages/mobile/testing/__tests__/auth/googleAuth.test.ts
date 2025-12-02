import { AuthError } from '@google-wallet-sdk/core'
import { GoogleAuth } from '../../../src/auth/googleAuth'
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

jest.mock('@react-native-google-signin/google-signin', () => {
  const actual = jest.requireActual('@react-native-google-signin/google-signin')
  return {
    ...actual,
    isErrorWithCode: (
      error: unknown
    ): error is { code: string; message?: string } => {
      if (!error) return false
      if (typeof error === 'object' && error !== null) {
        return 'code' in error
      }
      return false
    },
  }
})

describe('Google authentication unit tests', () => {
  const googleAuth = new GoogleAuth('webClientId', 'iosClientId', [
    'scope1',
    'scope2',
  ])
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('should sign in successfully and return mocked user info', async () => {
    const result = await googleAuth.signIn()
    expect(result).toBe('mock-access-token')
  })

  it('should throw an error if user sign in already in progress', async () => {
    jest.spyOn(GoogleSignin, 'signIn').mockRejectedValueOnce({
      code: statusCodes.IN_PROGRESS,
    })
    try {
      await googleAuth.signIn()
      fail('Should have thrown AuthenticationAlreadyInProgressError')
    } catch (error: unknown) {
      expect(isAuthError(error)).toBe(true)
      if (isAuthError(error)) {
        expect(error.code).toBe('AUTHENTICATION_IN_PROGRESS')
      }
    }
  })

  it('should throw an error if play services are not available', async () => {
    jest.spyOn(GoogleSignin, 'hasPlayServices').mockRejectedValueOnce({
      code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
    })
    try {
      await googleAuth.signIn()
      fail('Should have thrown PlayServicesNotAvailableError')
    } catch (error: unknown) {
      expect(isAuthError(error)).toBe(true)
      if (isAuthError(error)) {
        expect(error.code).toBe('PLAY_SERVICES_NOT_AVAILABLE')
      }
    }
  })

  it('should throw an error if user cancels authentication', async () => {
    jest.spyOn(GoogleSignin, 'signIn').mockRejectedValueOnce({
      code: statusCodes.SIGN_IN_CANCELLED,
    })
    try {
      await googleAuth.signIn()
      fail('Should have thrown AuthenticationCancelledError')
    } catch (error: unknown) {
      expect(isAuthError(error)).toBe(true)
      if (isAuthError(error)) {
        expect(error.code).toBe('AUTHENTICATION_CANCELLED')
      }
    }
  })

  it('should throw an error if an unexpected error occurs', async () => {
    jest.spyOn(GoogleSignin, 'signIn').mockRejectedValue({
      code: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred',
    })
    await expect(googleAuth.signIn()).rejects.toThrow(AuthError)
  })

  it('should get the access token successfully', async () => {
    const result = await googleAuth.getAccessToken('oldAccessToken')
    expect(result).toBe('mock-access-token')
  })

  it('should throw an error if the access token cannot be refreshed', async () => {
    jest
      .spyOn(GoogleSignin, 'clearCachedAccessToken')
      .mockRejectedValue(new Error('Failed to refresh access token'))
    try {
      await googleAuth.getAccessToken('oldAccessToken')
      fail('Should have thrown TokenRefreshError')
    } catch (error: unknown) {
      expect(isAuthError(error)).toBe(true)
      if (isAuthError(error)) {
        expect(error.code).toBe('TOKEN_REFRESH_ERROR')
      }
    }
  })

  it('should sign out successfully', async () => {
    await googleAuth.signOut()
    expect(GoogleSignin.signOut).toHaveBeenCalled()
  })

  it('should throw an error if the sign out fails', async () => {
    jest
      .spyOn(GoogleSignin, 'signOut')
      .mockRejectedValue(new Error('Failed to log out'))
    try {
      await googleAuth.signOut()
      fail('Should have thrown SignOutError')
    } catch (error: unknown) {
      expect(isAuthError(error)).toBe(true)
      if (isAuthError(error)) {
        expect(error.code).toBe('SIGN_OUT_FAILED')
      }
    }
  })
})
