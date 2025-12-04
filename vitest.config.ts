import { defineConfig } from 'vitest/config'
import * as path from 'path';
import { fileURLToPath } from 'url';

const prismaCustomClientPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '.prisma-custom', 'client')

export default defineConfig(async function () {
  const provider = (() => {
    if (process.env.DATABASE_URL?.includes('mongodb')) {
      return "mongodb"
    }

    if (process.env.DATABASE_URL?.includes("mysql")) {
      return "mysql"
    }

    return "postgresql"
  })()

  return {
    test: {
      include: ['src/**/*.test.ts'],
      testTimeout: 40000,
      globals: true,
      globalSetup: './testing/global-setup.ts',
      alias: {
        '@prisma-custom/client': prismaCustomClientPath,
      },
      maxWorkers: provider === "postgresql" ? 4 : 1,
      sequence: {
        concurrent: provider === "postgresql",
      },
    },
    resolve: {
      alias: {
        '@prisma-custom/client': prismaCustomClientPath,
      }
    },
  }
})