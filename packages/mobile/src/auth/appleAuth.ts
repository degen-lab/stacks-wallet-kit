import {
  AppleAuthError,
  AuthProvider,
  AuthenticatedUser,
  AuthenticationCancelledError,
  IAuthentication,
} from '@degenlab/stacks-wallet-kit-core'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'

type AppleAuthenticationModule = {
  AppleAuthenticationScope: {
    FULL_NAME: unknown
    EMAIL: unknown
  }
  signInAsync(options: {
    requestedScopes?: unknown[]
    nonce?: string
  }): Promise<{
    user: string
    email?: string | null
    fullName?: {
      givenName?: string | null
      familyName?: string | null
    } | null
    identityToken?: string | null
    authorizationCode?: string | null
  }>
}

export class AppleAuth implements IAuthentication {
  readonly provider: AuthProvider = 'apple'

  async signIn(): Promise<AuthenticatedUser> {
    const AppleAuthentication = await this.loadAppleAuthentication()
    const rawNonce = bytesToHex(randomBytes(32))
    const hashedNonce = bytesToHex(sha256(new TextEncoder().encode(rawNonce)))

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })

      return {
        provider: 'apple',
        providerUserId: credential.user,
        email: credential.email ?? null,
        emailPrivate:
          credential.email?.endsWith('@privaterelay.appleid.com') ?? undefined,
        displayName:
          [credential.fullName?.givenName, credential.fullName?.familyName]
            .filter(Boolean)
            .join(' ') || null,
        photoUri: null,
        credentials: {
          idToken: credential.identityToken ?? undefined,
          authorizationCode: credential.authorizationCode ?? undefined,
          rawNonce,
        },
        appleProfile: {
          fullName: {
            givenName: credential.fullName?.givenName ?? null,
            familyName: credential.fullName?.familyName ?? null,
          },
        },
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === 'ERR_REQUEST_CANCELED'
      ) {
        throw new AuthenticationCancelledError()
      }
      const message =
        error instanceof Error ? error.message : 'Apple sign-in failed'
      throw new AppleAuthError(message, 'APPLE_AUTH_ERROR', error)
    }
  }

  async signOut(): Promise<void> {
    return Promise.resolve()
  }

  private async loadAppleAuthentication(): Promise<AppleAuthenticationModule> {
    try {
      return (await import(
        'expo-apple-authentication'
      )) as AppleAuthenticationModule
    } catch (error) {
      throw new AppleAuthError(
        'expo-apple-authentication is not available',
        'APPLE_AUTH_UNAVAILABLE',
        error
      )
    }
  }
}
