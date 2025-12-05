import { afterAll, it as vitestIt, describe as vitestDescribe, type SuiteFactory, expect as vitestExpect, type TestAPI } from "vitest"
import { PrismaClient } from "@prisma/client"
import * as TestClients from "./client"
import type { PrismockClientType } from "../src/lib/client"
import slugify from "slugify"
import { fetchProvider } from "../src/lib/prismock"
import { simulateSeed } from "."
import { createDatabaseUsingPostgres } from "./client"

type TestContextExtended = {
  prisma: PrismaClient
  prismock: PrismockClientType
  isolated: (cb: (deps: { prisma: PrismaClient; prismock: PrismockClientType; seedData: () => Promise<void> }) => Promise<void>) => Promise<void>
}

async function getPrismockClient() {
  if (process.env.PRISMOCK_USE_PG_LITE) {
    const { prismock, pglite } = await TestClients.createPgLitePrismockClient()

    await createDatabaseUsingPostgres({
      databaseName: "in-memory",
      // pglite has a connection to a single database, so nothing to do here
      execWithSetupClient: async () => {},
      execWithClient: async (queries) => {
        for (const query of queries) {
          await pglite.exec(query)
        }
      },
    })

    return prismock
  }

  return TestClients.createPrismockClient()
}

const fileLevelClients = new Map<string, { prisma: PrismaClient; prismock: PrismockClientType }>()

export function fileClientsName(name: string) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
    replacement: "_",
  }).substring(0, 62)
}

function getDatabaseName() {
  return fileClientsName(vitestExpect.getState().testPath?.replace(process.cwd(), "") ?? "")
}

export async function getFileLevelClients(name: string) {
  if (fileLevelClients.has(name)) {
    return fileLevelClients.get(name)!
  }

  const prismaClient = await (async () => {
    const databaseUrl = await TestClients.createDatabase({ databaseName: name })
    const prisma = await TestClients.createPrismaClient({ databaseUrl })

    return prisma
  })()

  const prismock = await getPrismockClient()

  const clients = { prisma: prismaClient, prismock }

  fileLevelClients.set(name, clients)

  return clients
}

const cleanupFileLevelClients = async () => {
  const entries = Array.from(fileLevelClients.entries())

  for (const [name, { prisma }] of entries) {
    await prisma.$disconnect()

    await TestClients.cleanupDatabase({ databaseName: name })
  }

  fileLevelClients.clear()
}

afterAll(async () => {
  await cleanupFileLevelClients()
})

export const it = vitestIt.extend<TestContextExtended>({
  prisma: async function ({ task }, use) {
    const { prisma } = await getFileLevelClients(getDatabaseName())

    await use(prisma)
  },
  prismock: async ({ task }, use) => {
    const { prismock } = await getFileLevelClients(getDatabaseName())

    return use(prismock)
  },
  /**
   * Spin up a new database and pass in the prisma and prismock clients to the callback
   */
  isolated: async ({ task }, use) => {
    const instanceId = Math.random()
    .toString(36)
    .substring(2, 2 + 10)

    await use(async function (cb) {
      const databaseName = `prismock_${instanceId}`
      const databaseUrl = await TestClients.createDatabase({ databaseName })

      const prisma = await TestClients.createPrismaClient({ databaseUrl })
      const prismock = await getPrismockClient()

      await cb({ prisma, prismock, seedData: async () => {
        await simulateSeed(prismock)
        await simulateSeed(prisma)
      } })

       /**
     * Destory the database after the callback is complete
     */
      await TestClients.cleanupDatabase({ databaseName })
    })
  },
})

type DescribeInnerCallback = (test: TestAPI & { prisma: PrismaClient; prismock: PrismockClientType; reset: () => Promise<void> }) => Promise<void> | void

export function describeInner(name: string, callback: DescribeInnerCallback) {
  vitestDescribe<{ prisma: PrismaClient; prismock: PrismockClientType }>(name, async (testApi) => {
    const databaseName = getDatabaseName()

    const fileLevelClients = await getFileLevelClients(databaseName)

    const augmentedTestApi = Object.assign({
      ...fileLevelClients!,
      reset: async () => {
        await TestClients.resetDatabase({ databaseName })
        await fileLevelClients.prismock.reset()
      }
    }, testApi)

    return callback(augmentedTestApi)
  })
}

export const describe = Object.assign(describeInner, vitestDescribe)
