import {
  AuthProvider,
  AuthenticatedUser,
  AuthenticationAlreadyInProgressError,
  AuthenticationCancelledError,
  AuthError,
  IAuthentication,
  ISilentSignInCapable,
  ITokenRefreshCapable,
  PlayServicesNotAvailableError,
  SignInRequiredError,
  SignOutError,
  TokenRefreshError,
} from '@degenlab/stacks-wallet-kit-core'
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { SCOPES } from '../helper/constants'

type GoogleUserData = {
  user: {
    id: string
    email: string
    name: string | null
    photo: string | null
    familyName: string | null
    givenName: string | null
  }
  scopes: string[]
  idToken: string | null
  serverAuthCode: string | null
}

export class GoogleAuth
  implements IAuthentication, ISilentSignInCapable, ITokenRefreshCapable
{
  readonly provider: AuthProvider = 'google'

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

  async signInSilently(): Promise<AuthenticatedUser> {
    try {
      const signInResponse = await GoogleSignin.signInSilently()
      if (!signInResponse.data) {
        throw new SignInRequiredError()
      }
      const { accessToken, idToken } = await GoogleSignin.getTokens()
      return this.toAuthenticatedUser(
        signInResponse.data as GoogleUserData,
        accessToken,
        idToken
      )
    } catch (error) {
      if (error instanceof SignInRequiredError) {
        throw error
      }

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            throw new AuthenticationAlreadyInProgressError()
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new PlayServicesNotAvailableError()
          case statusCodes.SIGN_IN_CANCELLED:
            throw new AuthenticationCancelledError()
          case statusCodes.SIGN_IN_REQUIRED:
            throw new SignInRequiredError()
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

  async signIn(): Promise<AuthenticatedUser> {
    try {
      await GoogleSignin.hasPlayServices()
      const signInResponse = await GoogleSignin.signIn()
      if (!signInResponse.data) {
        throw new AuthError('User not found', 'USER_NOT_FOUND')
      }
      const { accessToken, idToken } = await GoogleSignin.getTokens()
      return this.toAuthenticatedUser(
        signInResponse.data as GoogleUserData,
        accessToken,
        idToken
      )
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

  async getAccessToken(oldAccessToken = ''): Promise<string> {
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

  private toAuthenticatedUser(
    data: GoogleUserData,
    accessToken: string,
    idToken: string
  ): AuthenticatedUser {
    return {
      provider: 'google',
      providerUserId: data.user.id,
      email: data.user.email,
      displayName: data.user.name,
      photoUri: data.user.photo,
      credentials: {
        accessToken,
        idToken,
        serverAuthCode: data.serverAuthCode ?? undefined,
      },
    }
  }
}
