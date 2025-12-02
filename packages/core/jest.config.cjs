module.exports = {
  displayName: 'core',
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
  moduleNameMapper: {
    '^@stacks/transactions$':
      '<rootDir>/testing/__mocks__/@stacks/transactions.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!.*(@scure|@noble|micro-packed|@stacks))',
  ],
}
