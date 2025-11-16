/** @jest-config-loader ts-node */
import type { Config } from "jest";
import { createDefaultEsmPreset } from 'ts-jest'

const config: Config = {
  ...createDefaultEsmPreset(),
  globalSetup: './testing/global-setup.ts',
  maxWorkers: 1,
  testEnvironment: 'node',
};


export default config;