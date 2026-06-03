import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts', '**/*.e2e.test.ts', '**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/testcontainers.ts'],
  moduleNameMapper: {
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  testTimeout: 60000, // Testcontainers might take some time to boot
};

export default config;
