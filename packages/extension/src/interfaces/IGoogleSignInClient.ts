export interface IGoogleSignInClient {
  loginWithGoogle(
    googleClientId: string,
    googleClientSecret: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<{ accessToken: string; refreshToken: string; idToken?: string }>

  getAccessToken(
    googleClientId: string,
    googleClientSecret: string,
    refreshToken: string
  ): Promise<string>

  logOut(): Promise<void>
}
