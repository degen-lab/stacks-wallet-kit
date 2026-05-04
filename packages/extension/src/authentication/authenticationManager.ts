import {
  AuthProvider,
  AuthenticatedUser,
  AuthError,
  IAuthentication,
  ISilentSignInCapable,
  IStorageManager,
  ITokenRefreshCapable,
} from '@degenlab/stacks-wallet-kit-core'
import { IGoogleSignInClient } from '../interfaces/IGoogleSignInClient'

export class AuthenticationManager
  implements IAuthentication, ISilentSignInCapable, ITokenRefreshCapable
{
  readonly provider: AuthProvider = 'google'

  constructor(
    private googleSignInClient: IGoogleSignInClient,
    private googleClientId: string,
    private googleClientSecret: string,
    private redirectUri: string,
    private scopes: string[],
    private storageManager: IStorageManager
  ) {}

  async signIn(): Promise<AuthenticatedUser> {
    const { accessToken, refreshToken, idToken } =
      await this.googleSignInClient.loginWithGoogle(
        this.googleClientId,
        this.googleClientSecret,
        this.redirectUri,
        this.scopes
      )
    await this.storageManager.setItem('refreshToken', refreshToken)
    return {
      provider: 'google',
      providerUserId: '',
      email: null,
      displayName: null,
      photoUri: null,
      credentials: { accessToken, idToken: idToken || '' },
    }
  }

  async signOut(): Promise<void> {
    return Promise.resolve()
  }

  async getAccessToken(refreshToken?: string): Promise<string> {
    const token =
      refreshToken ??
      (await this.storageManager.getItem<string>('refreshToken'))
    if (!token) {
      throw new AuthError('Refresh token not found', 'REFRESH_TOKEN_REQUIRED')
    }
    return this.googleSignInClient.getAccessToken(
      this.googleClientId,
      this.googleClientSecret,
      token
    )
  }

  async signInSilently(): Promise<AuthenticatedUser> {
    const storedRefreshToken =
      await this.storageManager.getItem<string>('refreshToken')
    if (!storedRefreshToken) {
      throw new AuthError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED')
    }
    const accessToken = await this.googleSignInClient.getAccessToken(
      this.googleClientId,
      this.googleClientSecret,
      storedRefreshToken
    )
    return {
      provider: 'google',
      providerUserId: '',
      email: null,
      displayName: null,
      photoUri: null,
      credentials: { accessToken },
    }
  }
}
