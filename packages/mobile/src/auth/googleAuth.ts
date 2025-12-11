import {
  AuthenticationAlreadyInProgressError,
  AuthenticationCancelledError,
  AuthError,
  IAuthentication,
  PlayServicesNotAvailableError,
  SignOutError,
  TokenRefreshError,
} from '@degenlab/stacks-wallet-kit-core'
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  User,
} from '@react-native-google-signin/google-signin'
import { SCOPES } from '../helper/constants'
export class GoogleAuth implements IAuthentication {
  constructor(webClientId: string, iosClientId: string, scopes?: string[]) {
    const allScopes = scopes ? [...scopes, ...SCOPES] : SCOPES

    GoogleSignin.configure({
      webClientId,
      scopes: allScopes,
      iosClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    })
  }

  async signInSilently(): Promise<{ accessToken: string; user: User }> {
    const signInResponse = await GoogleSignin.signInSilently()
    if (!signInResponse.data) {
      throw new AuthError('User not found', 'USER_NOT_FOUND')
    }
    const { accessToken } = await GoogleSignin.getTokens()
    return {
      accessToken,
      user: signInResponse.data,
    }
  }

  async signIn(): Promise<{ accessToken: string; user: User }> {
    try {
      await GoogleSignin.hasPlayServices()
      const signInResponse = await GoogleSignin.signIn()
      if (!signInResponse.data) {
        throw new AuthError('User not found', 'USER_NOT_FOUND')
      }
      const { accessToken } = await GoogleSignin.getTokens()
      return {
        accessToken,
        user: signInResponse.data,
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            throw new AuthenticationAlreadyInProgressError()

          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new PlayServicesNotAvailableError()
          case statusCodes.SIGN_IN_CANCELLED:
            throw new AuthenticationCancelledError()
          default:
            throw new AuthError(error.message, 'AUTHENTICATION_ERROR')
        }
      }
      throw new AuthError(
        'An unexpected error occurred',
        'UNEXPECTED_ERROR',
        error
      )
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut()
    } catch (error) {
      throw new SignOutError(error)
    }
  }

  async getAccessToken(oldAccessToken: string): Promise<string> {
    try {
      if (oldAccessToken !== '') {
        await GoogleSignin.clearCachedAccessToken(oldAccessToken)
      }
      const { accessToken } = await GoogleSignin.getTokens()
      return accessToken
    } catch {
      throw new TokenRefreshError()
    }
  }
}
