/* eslint-disable */
export default {
  displayName: 'json-api-server-e2e',
  preset: '../../jest.preset.js',
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  globalTeardown: '<rootDir>/src/support/global-teardown.ts',
  setupFiles: ['<rootDir>/src/support/test-setup.ts'],
  testEnvironment: 'node',
  maxWorkers: 1,
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/json-api-server-e2e',
  moduleNameMapper: {
    '^@knoknox/json-api-nestjs$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs',
    '^@knoknox/json-api-nestjs-microorm$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-microorm',
    '^@knoknox/json-api-nestjs-shared$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-shared',
    '^@knoknox/json-api-nestjs-typeorm$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-typeorm',
    '^@knoknox/json-api-nestjs-sdk$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-sdk',
  },
};
