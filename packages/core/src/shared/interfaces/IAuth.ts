export interface IAuthentication {
  signIn(): Promise<string>
  signOut(): Promise<void>
  getAccessToken(oldAccessToken: string): Promise<string>
  signInSilently(): Promise<string>
}
