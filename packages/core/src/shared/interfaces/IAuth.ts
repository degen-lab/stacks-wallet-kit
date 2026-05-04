import { AuthenticatedUser, AuthProvider } from '../types/authTypes'

export interface IAuthentication {
  readonly provider: AuthProvider
  signIn(): Promise<AuthenticatedUser>
  signOut(): Promise<void>
}

export interface ISilentSignInCapable {
  signInSilently(): Promise<AuthenticatedUser>
}

export interface ITokenRefreshCapable {
  getAccessToken(oldAccessToken?: string): Promise<string>
}
