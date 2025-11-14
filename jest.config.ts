export default {
  globalSetup: './testing/global-setup.ts',
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  maxWorkers: 4,
};
