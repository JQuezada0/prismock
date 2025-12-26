import { defineConfig } from 'vitest/config'
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import { default as tsconfigPaths } from "vite-tsconfig-paths"

const prismaCustomClientPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '.prisma-custom', 'client')

export default defineConfig(async function () {
  const processorCount = os.cpus().length

  console.log("Setting max workers to:", processorCount);

  return {
    plugins: [tsconfigPaths({ loose: true })],
    test: {
      include: ['src/**/*.test.ts'],
      testTimeout: 40000,
      globals: true,
      globalSetup: './testing/global-setup.ts',
      server: {
        deps: {
          inline: ['@prisma/dmmf-v6', '@prisma/dmmf-v7'],
        },
      },
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