module.exports = {
  displayName: 'mobile',
  roots: ['<rootDir>/testing/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: false,
        tsconfig: {
          moduleResolution: 'node',
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@degenlab/stacks-wallet-kit-core$': '<rootDir>/../core/src/index.ts',
    '^@degenlab/stacks-wallet-kit-core/(.*)$': '<rootDir>/../core/src/$1',
    '^@react-native-google-signin/google-signin$':
      '<rootDir>/testing/__mocks__/google-signin.ts',
    '^expo-secure-store$': '<rootDir>/testing/__mocks__/expo-secure-store.ts',
    '^react-native-keychain$':
      '<rootDir>/testing/__mocks__/react-native-keychain.ts',
    '^crypto$': require.resolve('crypto-browserify'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(@scure|@noble|micro-packed|@react-native-google-signin|crypto-browserify))',
  ],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/testing/setup.ts'],
}
