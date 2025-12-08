import { defineConfig } from 'vitest/config'
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

const prismaCustomClientPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '.prisma-custom', 'client')

export default defineConfig(async function () {
  const processorCount = os.cpus().length

  console.log("Setting max workers to:", processorCount);

  return {
    test: {
      include: ['src/**/*.test.ts'],
      testTimeout: 40000,
      globals: true,
      globalSetup: './testing/global-setup.ts',
      alias: {
        '@prisma-custom/client': prismaCustomClientPath,
      },
      maxWorkers: processorCount,
    },
    resolve: {
      alias: {
        '@prisma-custom/client': prismaCustomClientPath,
      }
    },
    define: {
      PRISMA_MAJOR_VERSION: `"6"`,
    },
  }
})

function getConnectorName() {
  if (process.env.DATABASE_URL?.includes('mongodb')) {
    return "mongodb"
  }

  if (process.env.DATABASE_URL?.includes("mysql")) {
    return "mysql"
  }

  return "postgresql"
}