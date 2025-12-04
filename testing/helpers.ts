import { afterAll, it as vitestIt } from "vitest"
import { PrismaClient } from "@prisma/client"
import * as TestClients from "./client"
import type { PrismockClientType } from "../src/lib/client"
import slugify from "slugify"
import { fetchProvider } from "../src/lib/prismock"

type TestContextExtended = {
  prisma: PrismaClient
  prismock: PrismockClientType
  isolated: (cb: (deps: { prisma: PrismaClient; prismock: PrismockClientType }) => Promise<void>) => Promise<void>
}

async function getPrismockClient() {
  if (process.env.PRISMOCK_USE_PG_LITE) {
    return TestClients.createPgLitePrismockClient()
  }

  return TestClients.createPrismockClient()
}

const fileLevelClients = new Map<string, { prisma: PrismaClient; prismock: PrismockClientType }>()

const provider = await fetchProvider()

async function getFileLevelClients(name: string) {
  if (fileLevelClients.has(name)) {
    return fileLevelClients.get(name)!
  }

  const prismaClient = await (async () => {
    const databaseUrl = await TestClients.createDatabase({ databaseName: name })
    const prisma = await TestClients.createPrismaClient({ databaseUrl })

    return prisma
  })()

  const prismock = await TestClients.createPrismockClient()

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
    const databaseName = slugify(task.fullTestName, {
      lower: true,
      strict: true,
      trim: true,
      replacement: "_",
    }).substring(0, 62)

    const { prisma } = await getFileLevelClients(databaseName)

    await use(prisma)
  },
  prismock: async ({ task }, use) => {
    const databaseName = slugify(task.fullTestName, {
      lower: true,
      strict: true,
      trim: true,
      replacement: "_",
    }).substring(0, 62)

    const { prismock } = await getFileLevelClients(databaseName)

    return use(prismock)
  },
  /**
   * Spin up a new database and pass in the prisma and prismock clients to the callback
   */
  isolated: async ({ task }, use) => {
    const instanceId = Math.random()
    .toString(36)
    .substring(2, 2 + 10)

    const databaseName = `prismock_${instanceId}`
    const databaseUrl = await TestClients.createDatabase({ databaseName })

    await use(async function (cb) {
      const prisma = await TestClients.createPrismaClient({ databaseUrl })
      const prismock = await getPrismockClient()

      await cb({ prisma, prismock })
    })

    /**
     * Destory the database after the callback is complete
     */
    await TestClients.cleanupDatabase({ databaseName })
  },
})
