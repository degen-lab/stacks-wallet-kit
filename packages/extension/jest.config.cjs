module.exports = {
  displayName: 'extension',
  roots: ['<rootDir>/testing/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          moduleResolution: 'bundler',
          skipLibCheck: true,
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@degenlab/stacks-wallet-kit/core$': '<rootDir>/../core/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(@scure|@noble|micro-packed|@stacks))',
  ],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/testing/__mocks__/chrome.js'],
  setupFilesAfterEnv: [],
}
