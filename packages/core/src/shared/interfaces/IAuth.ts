export interface IAuthentication {
  signIn(): Promise<string>
  signOut(): Promise<void>
  getAccessToken(oldAccessToken: string): Promise<string>
  signInSilently(refreshToken?: string): Promise<string>
}
