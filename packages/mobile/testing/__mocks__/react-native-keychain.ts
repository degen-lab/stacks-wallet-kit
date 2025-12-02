const storage: Record<string, { username: string; password: string }> = {}

const setGenericPassword = jest.fn(
  async (
    username: string,
    password: string
  ): Promise<{ service: string } | false> => {
    storage[username] = { username, password }
    return { service: username }
  }
)

const getGenericPassword = jest.fn(
  async (options?: {
    service?: string
  }): Promise<
    | {
        service: string
        username: string
        password: string
      }
    | false
  > => {
    const service = options?.service
    if (!service) return false
    const item = storage[service]
    if (!item) return false
    return {
      service,
      username: item.username,
      password: item.password,
    }
  }
)

const resetGenericPassword = jest.fn(
  async (options?: { service?: string }): Promise<boolean> => {
    const service = options?.service
    if (service && storage[service]) {
      delete storage[service]
      return true
    }
    return false
  }
)

const ACCESSIBLE = {
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  ALWAYS_THIS_DEVICE_ONLY: 'ALWAYS_THIS_DEVICE_ONLY',
}

const clearMockStorage = (): void => {
  Object.keys(storage).forEach((key) => delete storage[key])
}

export default {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
  ACCESSIBLE,
  clearMockStorage,
}

export {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
  ACCESSIBLE,
  clearMockStorage,
}
