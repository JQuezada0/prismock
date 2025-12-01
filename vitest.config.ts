import { defineConfig } from 'vitest/config'
import * as path from 'path';
import { fileURLToPath } from 'url';

const prismaCustomClientPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '.prisma-custom', 'client')

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 40000,
    globals: true,
    maxWorkers: 1,
    globalSetup: './testing/global-setup.ts',
    alias: {
      '@prisma-custom/client': prismaCustomClientPath,
    },
  },
  resolve: {
    alias: {
      '@prisma-custom/client': prismaCustomClientPath,
    }
  },
})