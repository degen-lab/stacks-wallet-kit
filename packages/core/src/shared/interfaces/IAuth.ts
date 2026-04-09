import { User } from '../types/backupTypes'

export interface IAuthentication {
  signIn(): Promise<{
    accessToken: string
    idToken: string
    user: User | undefined
  }>
  signOut(): Promise<void>
  getAccessToken(oldAccessToken: string): Promise<string>
  signInSilently(): Promise<{
    accessToken: string
    idToken: string
    user: User | undefined
  }>
}
