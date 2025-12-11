import {
  AuthError,
  IAuthentication,
  IStorageManager,
} from '@degenlab/stacks-wallet-kit-core'
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

  async signIn(): Promise<{ accessToken: string; user: object }> {
    const { accessToken, refreshToken } =
      await this.googleSignInClient.loginWithGoogle(
        this.googleClientId,
        this.googleClientSecret,
        this.redirectUri,
        this.scopes
      )
    await this.storageManager.setItem('refreshToken', refreshToken)
    return { accessToken, user: {} }
  }

  /**
   * Sign out from the wallet
   * Note: Not needed for the moment - logout is handled by the storage manager and the high level client module
   */
  async signOut(): Promise<void> {
    // Call the Google sign-in client's logout to revoke tokens
    // await this.googleSignInClient.logOut()
    // Clear the stored refresh token from storage
    // await this.storageManager.removeItem('refreshToken')
  }

  async getAccessToken(refreshToken: string): Promise<string> {
    return await this.googleSignInClient.getAccessToken(
      this.googleClientId,
      this.googleClientSecret,
      refreshToken
    )
  }

  async signInSilently(): Promise<{ accessToken: string; user: object }> {
    const storedRefreshToken =
      await this.storageManager.getItem<string>('refreshToken')

    if (!storedRefreshToken) {
      throw new AuthError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED')
    }
    return {
      accessToken: await this.googleSignInClient.getAccessToken(
        this.googleClientId,
        this.googleClientSecret,
        storedRefreshToken
      ),
      user: {},
    }
  }
}
