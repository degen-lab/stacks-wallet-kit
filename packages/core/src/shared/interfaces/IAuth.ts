export interface IAuthentication {
  signIn(): Promise<{ accessToken: string; user: object }>
  signOut(): Promise<void>
  getAccessToken(oldAccessToken: string): Promise<string>
  signInSilently(): Promise<{ accessToken: string; user: object }>
}
