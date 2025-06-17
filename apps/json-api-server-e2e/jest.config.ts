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
    '^@knoknoxjson-api-nestjs$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs',
    '^@knoknoxjson-api-nestjs-microorm$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-microorm',
    '^@knoknoxjson-api-nestjs-shared$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-shared',
    '^@knoknoxjson-api-nestjs-typeorm$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-typeorm',
    '^@knoknoxjson-api-nestjs-sdk$':
      '<rootDir>/../../dist/libs/json-api/json-api-nestjs-sdk',
  },
};
