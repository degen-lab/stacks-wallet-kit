import { AuthError } from '@degenlab/stacks-wallet-kit/core'
import { IGoogleSignInClient } from '../interfaces/IGoogleSignInClient'
import {
  AUTHENTICATION_URL,
  GET_TOKEN_URL,
  REVOKE_TOKEN_URL,
} from '../utils/constants'

export class GoogleSigninClient implements IGoogleSignInClient {
  async getAccessToken(
    googleClientId: string,
    googleClientSecret: string,
    refreshToken: string
  ): Promise<string> {
    const tokenUrl = GET_TOKEN_URL

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${error}`)
    }

    const tokens = await response.json()

    return tokens.access_token
  }

  async loginWithGoogle(
    googleClientId: string,
    googleClientSecret: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const authUrl = new URL(AUTHENTICATION_URL)
    authUrl.searchParams.set('client_id', googleClientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    const redirectUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError)
          }
          if (!responseUrl) {
            return reject(
              new AuthError('No redirect URL received', 'NO_REDIRECT_URL')
            )
          }
          resolve(responseUrl)
        }
      )
    })

    const url = new URL(redirectUrl)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error) {
      if (error === 'access_denied') {
        throw new AuthError(
          'User cancelled Google authentication',
          'GOOGLE_AUTH_CANCELED'
        )
      } else {
        throw new AuthError(
          `Google authentication failed: ${errorDescription || error}`,
          'GOOGLE_AUTH_FAILED'
        )
      }
    }

    if (!code) {
      throw new AuthError(
        'No authorization code found in redirect URL',
        'AUTHORIZATION_CODE_NOT_FOUND'
      )
    }

    const tokens = await this.exchangeCodeForTokens(
      googleClientId,
      googleClientSecret,
      redirectUri,
      code
    )
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    }
  }

  async logOut(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }

        if (!token) {
          // No token to revoke, just resolve
          return resolve()
        }

        // Revoke the token via Google OAuth API
        const revokeUrl = REVOKE_TOKEN_URL(token)
        fetch(revokeUrl)
          .then((response) => {
            if (!response.ok) {
              throw new AuthError(
                `Token revocation failed: ${response.status} ${response.statusText}`,
                'TOKEN_REVOCATION_FAILED'
              )
            }
            // Remove the cached token
            chrome.identity.removeCachedAuthToken({ token }, () => {
              if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError)
              }
              resolve()
            })
          })
          .catch((error) => {
            if (error instanceof AuthError) {
              reject(error)
            } else {
              reject(
                new AuthError(
                  `Token revocation failed: ${error.message}`,
                  'TOKEN_REVOCATION_FAILED'
                )
              )
            }
          })
      })
    })
  }

  private async exchangeCodeForTokens(
    googleClientId: string,
    googleClientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<{
    access_token: string
    refresh_token: string
    expires_at: number
    salt: string
  }> {
    const tokenUrl = 'https://oauth2.googleapis.com/token'

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new AuthError(
        `Token exchange failed: ${error}`,
        'TOKEN_EXCHANGE_FAILED'
      )
    }

    const tokens = await response.json()

    const expiresAt =
      Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600)

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      salt: '',
    }
  }
}
