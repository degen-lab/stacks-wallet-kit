require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoCloudKitBackup'
  s.version        = package['version']
  s.summary        = 'CloudKit wallet backup module for stacks-wallet-kit.'
  s.description    = 'Stores encrypted stacks-wallet-kit wallet backups in the signed-in iCloud user private CloudKit database.'
  s.author         = package['author']
  s.homepage       = package.dig('repository', 'url')
  s.license        = package['license']
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => package.dig('repository', 'url') }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
