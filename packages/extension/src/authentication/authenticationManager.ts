import {
  AuthError,
  IAuthentication,
  IStorageManager,
} from '@google-wallet-sdk/core'
import { IGoogleSignInClient } from '../interfaces/IGoogleSignInClient'

export class AuthenticationManager implements IAuthentication {
  constructor(
    private googleSignInClient: IGoogleSignInClient,
    private googleClientId: string,
    private googleClientSecret: string,
    private redirectUri: string,
    private scopes: string[],
    private storageManager: IStorageManager
  ) {}

  async signIn(): Promise<string> {
    const { accessToken, refreshToken } =
      await this.googleSignInClient.loginWithGoogle(
        this.googleClientId,
        this.googleClientSecret,
        this.redirectUri,
        this.scopes
      )
    await this.storageManager.setItem('refreshToken', refreshToken)
    return accessToken
  }

  async signOut(): Promise<void> {
    await this.googleSignInClient.logOut()
  }

  async getAccessToken(refreshToken: string): Promise<string> {
    return await this.googleSignInClient.getAccessToken(
      this.googleClientId,
      this.googleClientSecret,
      refreshToken
    )
  }

  async signInSilently(refreshToken?: string): Promise<string> {
    if (!refreshToken) {
      throw new AuthError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED')
    }
    return await this.googleSignInClient.getAccessToken(
      this.googleClientId,
      this.googleClientSecret,
      refreshToken
    )
  }
}
