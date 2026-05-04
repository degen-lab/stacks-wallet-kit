export type AuthProvider = 'google' | 'apple'

export type GoogleCredentials = {
  accessToken: string
  idToken?: string
  serverAuthCode?: string
}

export type AppleCredentials = {
  idToken?: string
  authorizationCode?: string
  rawNonce: string
}

export type AppleProfile = {
  fullName: {
    givenName: string | null
    familyName: string | null
  }
}

type AuthenticatedUserBase<TProvider extends AuthProvider, TCredentials> = {
  provider: TProvider
  providerUserId: string
  email: string | null
  displayName: string | null
  photoUri: string | null
  credentials: TCredentials
}

export type GoogleAuthenticatedUser = AuthenticatedUserBase<
  'google',
  GoogleCredentials
>

export type AppleAuthenticatedUser = AuthenticatedUserBase<
  'apple',
  AppleCredentials
> & {
  emailPrivate?: boolean
  appleProfile: AppleProfile
}

export type AuthenticatedUser = GoogleAuthenticatedUser | AppleAuthenticatedUser
