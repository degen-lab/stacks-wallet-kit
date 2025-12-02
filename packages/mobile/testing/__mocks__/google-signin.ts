export const GoogleSignin = {
  configure: jest.fn(),
  signIn: jest.fn(async () => ({
    idToken: 'mock-id-tocken',
    user: { email: 'mocked-email@example.com', name: 'Test user' },
  })),
  hasPlayServices: jest.fn(async () => true),
  getTokens: jest.fn(async () => ({
    accessToken: 'mock-access-token',
    idToken: 'mock-id-token',
  })),
  signOut: jest.fn(async () => null),
  clearCachedAccessToken: jest.fn(async () => null),
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
}

export const isErrorWithCode = (
  error: unknown
): error is { code: string; message?: string } => {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    return 'code' in error
  }
  return false
}
