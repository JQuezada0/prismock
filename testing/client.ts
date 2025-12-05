import { PrismaClient, Prisma } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"
import { getClient, getPgLitePrismockData } from "../src/lib/client"
import { generateDMMF } from "../src/lib/dmmf"
import { spawnSync } from "child_process"
import { fetchProvider } from "../src/lib/prismock"

export type CreatePrismaClientOptionsInput = {
  databaseUrl?: string | null | undefined
  schemaPath?: string | null | undefined
}

export type CreatePrismaClientOptions = {
  databaseUrl: string | null | undefined
  schemaPath: string
}

function formatOptions(options: CreatePrismaClientOptionsInput): CreatePrismaClientOptions {
  return {
    ...options,
    databaseUrl: options.databaseUrl ?? process.env.DATABASE_URL,
    schemaPath: options.schemaPath ?? "./prisma/schema.prisma",
  }
}

export async function createPrismaClient(options: CreatePrismaClientOptionsInput = {}) {
  const { databaseUrl } = formatOptions(options)

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  return new PrismaClient({
    datasourceUrl: databaseUrl,
  })
}

export async function createPgLitePrismockClient(options: CreatePrismaClientOptionsInput = {}) {
  const { schemaPath } = formatOptions(options)

  const { PGlite } = await import("@electric-sql/pglite")
  const { PrismaPGlite } = await import("pglite-prisma-adapter")

  const pglite = new PGlite("memory://", {
    relaxedDurability: true,
  })
  const adapter = new PrismaPGlite(pglite)

  const client = new PrismaClient({
    adapter,
  })

  const prismockData = getPgLitePrismockData({
    schemaPath,
    pglite,
    adapter,
    datamodel: await generateDMMF(schemaPath),
    prismaClient: client,
  })

  return {
    prismock: Object.assign(client, prismockData),
    pglite,
  }
}

export async function createPrismockClient(options: CreatePrismaClientOptionsInput = {}) {
  const { Prisma, PrismaClient } = await import("@prisma/client")

  return await getClient({
    prismaModule: Prisma,
    prismaClient: PrismaClient,
    schemaPath: "./prisma/schema.prisma",
    usePgLite: false,
  })
}

type CreateDatabaseOptions = {
  databaseName: string
}

async function createDatabaseMysql(options: CreateDatabaseOptions) {
  const mysql = await import("mysql2/promise")

  const client = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
  }) 

  await client.query(`DROP DATABASE IF EXISTS ${options.databaseName};`)
  await client.query(`CREATE DATABASE ${options.databaseName}`)

  await client.end()
  
  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)

  const res = spawnSync(`bun prisma migrate reset --force --skip-seed`, {
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "ignore",
    cwd: process.cwd(),
    shell: true,
  })

  if (res.error) {
    throw res.error
  }

  return databaseUrl
}

async function createDatabaseMongodb(options: CreateDatabaseOptions) {
  const { MongoClient } = await import("mongodb")

  const client = new MongoClient(process.env.DATABASE_URL!)

  await client.db(options.databaseName).dropDatabase()

  await client.close()
  
  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)

  const res = spawnSync(`bun prisma migrate reset --force --skip-seed`, {
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "ignore",
    cwd: process.cwd(),
    shell: true,
  })

  if (res.error) {
    throw res.error
  }

  return databaseUrl
}

type CreateDatabaseUsingPostgresOptions = {
  databaseName: string
  execWithSetupClient: (query: string[]) => Promise<void>
  execWithClient: (query: string[]) => Promise<void>
}

export async function createDatabaseUsingPostgres(options: CreateDatabaseUsingPostgresOptions) {
  const schemaPathDir = path.dirname("./prisma/schema.prisma")
  const migrationsPath = path.join(schemaPathDir, "migrations")
  const migrationsDirContents = fs.readdirSync(migrationsPath, {
    withFileTypes: true
  })

  const migrationsDir = migrationsDirContents.filter((file) => file.isDirectory())

  await options.execWithSetupClient([
    `DROP DATABASE IF EXISTS ${options.databaseName} WITH (FORCE);`,
    `CREATE DATABASE ${options.databaseName}`
  ])

  const migrationQueries = await Promise.all(migrationsDir.map(async (migration) => {
    const migrationPath = path.join(migrationsPath, migration.name, "migration.sql")
    const migrationContent = await fs.promises.readFile(migrationPath, "utf8")

    const unloggedSql = migrationContent.replace(/CREATE TABLE/gi, 'CREATE UNLOGGED TABLE');

    return unloggedSql
  }))

  await options.execWithClient([
    `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`,
    ...migrationQueries,
  ])
}

export async function createDatabaseUsingMysql(options: CreateDatabaseUsingPostgresOptions) {
  const schemaPathDir = path.dirname("./prisma/schema.prisma")
  const migrationsPath = path.join(schemaPathDir, "migrations")
  const migrationsDirContents = fs.readdirSync(migrationsPath, {
    withFileTypes: true
  })

  const migrationsDir = migrationsDirContents.filter((file) => file.isDirectory())

  await options.execWithSetupClient([
    `DROP DATABASE IF EXISTS ${options.databaseName};`,
    `CREATE DATABASE ${options.databaseName}`
  ])

  const migrationQueries = await Promise.all(migrationsDir.map(async (migration) => {
    const migrationPath = path.join(migrationsPath, migration.name, "migration.sql")
    return await fs.promises.readFile(migrationPath, "utf8")
  }))

  await options.execWithClient([
    `DROP SCHEMA public;`,
    `CREATE SCHEMA public;`,
    ...migrationQueries,
  ])
}

export async function createDatabasePostgresql(options: CreateDatabaseOptions) {
  const pg = await import("pg")

  const connectionUri = useDatabase(process.env.DATABASE_URL!, "postgres")
  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)

  const setupClient = new pg.Client({
    connectionString: connectionUri,
  })

  const client = new pg.Client({
    connectionString: databaseUrl,
  })

  await setupClient.connect()

  try {
    await createDatabaseUsingPostgres({
      databaseName: options.databaseName,
      execWithSetupClient: async (queries) => {
        for (const query of queries) {
          await setupClient.query(query)
        }
  
        await setupClient.end()
        await client.connect()
      },
      execWithClient: async (queries) => {
        for (const query of queries) {
          await client.query(query)
        }
  
        await client.end()
      }
    })
  } finally {
    await setupClient.end()
    await client.end()
  }

  return databaseUrl
}

export async function resetDatabasePostgresql(options: CreateDatabaseOptions) {
  const pg = await import("pg")

  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)
  const client = new pg.Client({
    connectionString: databaseUrl,
  })

  const schemaPathDir = path.dirname("./prisma/schema.prisma")
  const migrationsPath = path.join(schemaPathDir, "migrations")
  const migrationsDirContents = fs.readdirSync(migrationsPath, {
    withFileTypes: true
  })

  const migrationsDir = migrationsDirContents.filter((file) => file.isDirectory())

  await client.connect()
  await client.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)

  for (const migration of migrationsDir) {
    const migrationPath = path.join(migrationsPath, migration.name, "migration.sql")
    const migrationContent = await fs.promises.readFile(migrationPath, "utf8")

    const unloggedSql = migrationContent.replace(/CREATE TABLE/gi, 'CREATE UNLOGGED TABLE');

    await client.query(unloggedSql)
  }

  await client.end()

  return databaseUrl
}

export async function resetDatabaseMysql(options: CreateDatabaseOptions) {
  // const mysql = await import("mysql2/promise")
  
  // const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)
  // const client = await mysql.createConnection({
  //   uri: databaseUrl,
  // }) 

  // await createDatabaseUsingMysql({
  //   databaseName: options.databaseName,
  //   execWithSetupClient: async () => {},
  //   execWithClient: async (queries) => {
  //     for (const query of queries) {
  //       await client.query(query)
  //     }
  //   },
  // })

  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)

  const res = spawnSync(`bun prisma migrate reset --force --skip-seed`, {
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "ignore",
    cwd: process.cwd(),
    shell: true,
  })

  if (res.error) {
    throw res.error
  }

  return databaseUrl
}

async function resetDatabaseMongodb(options: CreateDatabaseOptions) {
  const databaseUrl = useDatabase(process.env.DATABASE_URL!, options.databaseName)

  const res = spawnSync(`bun prisma migrate reset --force --skip-seed`, {
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "ignore",
    cwd: process.cwd(),
    shell: true,
  })

  if (res.error) {
    throw res.error
  }

  return databaseUrl
}

export async function createDatabase(options: CreateDatabaseOptions) {
  const provider = await fetchProvider()
  
  if (provider === "postgresql") {
    return createDatabasePostgresql(options)
  } else if (provider === "mongodb") {
    return createDatabaseMongodb(options)
  } else if (provider === "mysql") {
    return createDatabaseMysql(options)
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

async function cleanupDatabaseMysql(options: CreateDatabaseOptions) {
  const mysql = await import("mysql2/promise")

  const client = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
  })

  await client.query(`DROP DATABASE IF EXISTS ${options.databaseName};`)
  await client.end()
}

async function cleanupDatabaseMongodb(options: CreateDatabaseOptions) {
  const { MongoClient } = await import("mongodb")

  const client = new MongoClient(process.env.DATABASE_URL!)

  await client.db("admin").dropDatabase({
    dbName: options.databaseName,
  })
}

async function cleanupDatabasePostgresql(options: CreateDatabaseOptions) {
  const pg = await import("pg")

  const connectionUri = useDatabase(process.env.DATABASE_URL!, "postgres")

  const client = new pg.Client({
    connectionString: connectionUri,
  })

  await client.connect()

  try {
    await client.query(`DROP DATABASE IF EXISTS ${options.databaseName} WITH (FORCE);`)
  } finally {
    await client.end()
  }
}

export async function cleanupDatabase(options: CreateDatabaseOptions) {
  const provider = await fetchProvider()

  if (provider === "postgresql") {
    return cleanupDatabasePostgresql(options)
  } else if (provider === "mongodb") {
    return cleanupDatabaseMongodb(options)
  } else if (provider === "mysql") {
    return cleanupDatabaseMysql(options)
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

export async function resetDatabase(options: CreateDatabaseOptions) {
  const provider = await fetchProvider()

  if (provider === "postgresql") {
    return resetDatabasePostgresql(options)
  } else if (provider === "mysql") {
    return resetDatabaseMysql(options)
  } else if (provider === "mongodb") {
    return resetDatabaseMongodb(options)
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

export function useDatabase(connectionUri: string, newDatabase: string): string {
  const url = new URL(connectionUri)
  url.pathname = `/${newDatabase}`
  return url.toString()
}
