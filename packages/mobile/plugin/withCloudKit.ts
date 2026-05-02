import type { ConfigPlugin } from 'expo/config-plugins'
import ConfigPlugins from 'expo/config-plugins.js'

const { withEntitlementsPlist, withInfoPlist } = ConfigPlugins

// key names are defined by Apple and never change
const ICLOUD_SERVICES_KEY = 'com.apple.developer.icloud-services'
const ICLOUD_CONTAINER_IDENTIFIERS_KEY = 'com.apple.developer.icloud-container-identifiers'

/** Info.plist key the native CloudKit module reads to resolve the container at runtime. */
export const CLOUDKIT_CONTAINER_INFO_PLIST_KEY = 'ExpoCloudKitContainerIdentifier'

export type WithCloudKitOptions = {
  /**
   * CloudKit container identifier to use for wallet backups.
   * Defaults to `iCloud.<ios.bundleIdentifier>`.
   *
   * Override when your container ID does not match the bundle ID, for example
   * when a development build needs to target the production container:
   *
   * ```json
   * ["@degenlab/stacks-wallet-kit-mobile", { "containerIdentifier": "iCloud.com.yourapp" }]
   * ```
   */
  containerIdentifier?: string
}

const withCloudKit: ConfigPlugin<WithCloudKitOptions | void> = (config, options) => {
  const { bundleIdentifier } = config.ios ?? {}

  if (!bundleIdentifier) {
    throw new Error(
      '[@degenlab/stacks-wallet-kit-mobile] ios.bundleIdentifier must be set in your app config to use CloudKit.'
    )
  }

  const containerIdentifier = options?.containerIdentifier ?? `iCloud.${bundleIdentifier}`

  const withEntitlements = withEntitlementsPlist(config, (c) => {
    const e = c.modResults
    e[ICLOUD_SERVICES_KEY] = [...new Set([...((e[ICLOUD_SERVICES_KEY] as string[]) ?? []), 'CloudKit'])]
    e[ICLOUD_CONTAINER_IDENTIFIERS_KEY] = [...new Set([...((e[ICLOUD_CONTAINER_IDENTIFIERS_KEY] as string[]) ?? []), containerIdentifier])]
    return c
  })

  return withInfoPlist(withEntitlements, (c) => {
    c.modResults[CLOUDKIT_CONTAINER_INFO_PLIST_KEY] = containerIdentifier
    return c
  })
}

export default withCloudKit
