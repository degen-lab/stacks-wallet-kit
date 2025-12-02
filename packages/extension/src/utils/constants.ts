export const SCOPES = ['https://www.googleapis.com/auth/drive.appdata']
export const AUTHENTICATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GET_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const REVOKE_TOKEN_URL = (token: string): string =>
  `https://accounts.google.com/o/oauth2/revoke?token=${token}`
