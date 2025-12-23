import type { PrismaClient } from "@prisma/client"
import type { DMMF } from "@prisma/generator-helper-v7"
import type * as runtime from "@prisma/client/runtime/library"
import * as path from "path"
import * as fs from "fs"

import { Data, Delegates, generateDelegates } from "./prismock"
import { applyExtensions, type ExtensionsDefinition } from "./extensions"
import { generateDMMF } from "./dmmf"
import { camelize } from "./helpers"
import type { PGlite } from "@electric-sql/pglite"
import type { PrismaPGlite } from "pglite-prisma-adapter"
import { getGlobals, type PrismaDMMF } from "./globals"

type GetData = () => Promise<Data>
type SetData = (data: Data) => Promise<void>

export interface PrismockData {
  getData: GetData
  setData: SetData
  reset: () => Promise<void>
}
export type PrismockClientType<T = PrismaClient> = T & PrismockData

type TransactionArgs<T> = (tx: Omit<T, "$transaction">) => unknown | Promise<unknown>[]

export type PrismockOptions = {
  usePgLite?:
    | undefined
    | null
    | {
        schemaPath: string
      }
}

export class Prismock {
  schemaPath: string
  datamodel?: DMMF.Document
  PrismaDMMF?: PrismaDMMF
  private genPromise: Promise<{ datamodel: DMMF.Document, PrismaDMMF: PrismaDMMF }>

  protected constructor(schemaPath: string) {
    this.schemaPath = schemaPath
    this.genPromise = this.generate().then(({ datamodel, PrismaDMMF }) => {
      this.datamodel = datamodel
      this.PrismaDMMF = PrismaDMMF

      return { datamodel, PrismaDMMF }
    })
  }

  static async create<PC = PrismaClient>(schemaPath: string) {
    const p = new Prismock(schemaPath)

    const { datamodel, PrismaDMMF } = await p.genPromise

    p.datamodel = datamodel
    p.PrismaDMMF = PrismaDMMF

    return p as unknown as PrismockClientType<PC>
  }

  static async createDefault(schemaPath: string) {
    const p = new Prismock(schemaPath)

    const { datamodel, PrismaDMMF } = await p.genPromise
    p.datamodel = datamodel
    p.PrismaDMMF = PrismaDMMF

    return p as unknown as PrismaClient & PrismockData
  }

  async reset() {
    await this.generate()
  }

  private async generate() {
    const datamodel = await generateDMMF(this.schemaPath)
    const { delegates, setData, getData } = await generateDelegates({
      models: [
        ...datamodel.datamodel.models,
      ],
    })

    Object.entries({ ...delegates, setData, getData }).forEach(([key, value]) => {
      if (key in this) Object.assign((this as unknown as Delegates)[key], value)
      else Object.assign(this, { [key]: value })
    })

    const { DMMF: PrismaDMMF } = await getGlobals()

    return { datamodel, PrismaDMMF }
  }

  async $connect() {
    await this.genPromise
    return this
  }

  $disconnect() {
    return Promise.resolve()
  }

  $on() {}

  $use() {
    return this
  }

  $executeRaw() {
    return Promise.resolve(0)
  }

  $executeRawUnsafe() {
    return Promise.resolve(0)
  }

  $queryRaw() {
    return Promise.resolve([])
  }

  $queryRawUnsafe() {
    return Promise.resolve([])
  }

  $extends(extensionDefs: ExtensionsDefinition) {
    if (!this.datamodel) {
      throw new Error("Datamodel not loaded")
    }

    if (!this.PrismaDMMF) {
      throw new Error("PrismaDMMF not loaded")
    }

    return applyExtensions(this as unknown as PrismaClient, extensionDefs, this.datamodel, this.PrismaDMMF)
  }

  async $transaction(args: any) {
    if (Array.isArray(args)) {
      return Promise.all(args)
    }

    return args(this)
  }
}

export function getPgLitePrismockData(options: {
  schemaPath: string
  pglite: InstanceType<typeof PGlite>
  adapter: InstanceType<typeof PrismaPGlite>
  datamodel: DMMF.Document
  prismaClient: Record<string, any>
}) {
  const schemaPathDir = path.dirname(options.schemaPath)
  const migrationsPath = path.join(schemaPathDir, "migrations")
  const migrationsDirContents = fs.readdirSync(migrationsPath, {
    withFileTypes: true
  })

  const migrationsDir = migrationsDirContents.filter((file) => file.isDirectory())

  const connectionPromise = options.adapter.connect()

  const reset = async () => {
    const connection = await connectionPromise

    await connection.executeScript(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `)

    for (const migration of migrationsDir) {
      const migrationPath = path.join(migrationsPath, migration.name, "migration.sql")
      const migrationContent = await fs.promises.readFile(migrationPath, "utf8")
  
      await connection.executeScript(migrationContent)

    }
  }

  const getData = async () => {
    const data: Data = {}

    for (const model of options.datamodel.datamodel.models) {
      const tableName = model.dbName ?? model.name

      const idColumn = model.fields.find((field) => field.isId)

      const defaultOrderBy = []

      if (idColumn) {
        defaultOrderBy.push({ [idColumn.dbName ?? idColumn.name]: "asc" })
      }

      const orderBy = model.primaryKey?.fields.map((field) => ({ [field]: "asc" as "asc" | "desc" })) ?? defaultOrderBy

      const items = await options.prismaClient[camelize(model.name) as keyof typeof options.prismaClient].findMany({
        orderBy,
      })

      data[camelize(model.name)] = items
    }

    return data
  }

  const setData = async (data: Data) => {
    for (const model in data) {
      const items = data[model]

      const prismaModel = options.datamodel.datamodel.models.find(
        (m) => camelize(m.name) === camelize(model) || m.dbName === model,
      )

      if (!prismaModel) {
        continue
      }

      const tableName = prismaModel.dbName ?? prismaModel.name

      // @ts-expect-error - model name
      await prisma[camelize(model) as keyof typeof prisma].createMany({
        data: items,
      })
    }
  }

  return {
    reset,
    getData,
    setData,
  } satisfies PrismockData
}

type GetClientOptions<PrismaClientClassType extends new (...args: any[]) => any> = {
  prismaClient: PrismaClientClassType
  schemaPath: string
  usePgLite?: boolean | null | undefined
  clientOptions?: Record<string, any>
}

export async function getClient<
  PrismaClientType extends new (...args: any[]) => any,
>(options: GetClientOptions<PrismaClientType>): Promise<PrismockClientType<InstanceType<PrismaClientType>>> {
  const datamodel = await generateDMMF(options.schemaPath)

  if (options.usePgLite) {
    const { PGlite } = await import("@electric-sql/pglite")
    const { PrismaPGlite } = await import("pglite-prisma-adapter")

    const pglite = new PGlite("memory://", {
      relaxedDurability: true,
      initialMemory: 1024 * 1024 * 1024, // 1GB
    })
    const adapter = new PrismaPGlite(pglite)

    const prisma = new options.prismaClient({
      adapter,
      ...options.clientOptions,
    })

    const prismockData = getPgLitePrismockData({
      schemaPath: options.schemaPath,
      pglite,
      adapter,
      datamodel,
      prismaClient: prisma,
    })

    await prismockData.reset()

    return Object.assign(prisma, prismockData)
  }

  return await Prismock.create<InstanceType<PrismaClientType>>(options.schemaPath)
}

type GetClientClassOptions<PrismaClientClassType extends new (...args: any[]) => any> = {
  PrismaClient: PrismaClientClassType
  schemaPath: string
  usePgLite?: boolean | null | undefined
}

type PrismaClientClassMocked<PrismaClientType extends new (...args: any[]) => any> = PrismaClientType extends new (
  ...args: infer Args
) => infer Instance
  ? (new (...args: Args) => Instance & PrismockData) & PrismaClientType
  : never

export async function getClientClass<PrismaClientType extends new (...args: any[]) => any>(
  options: GetClientClassOptions<PrismaClientType>,
): Promise<PrismaClientClassMocked<PrismaClientType>> {
  const datamodel = await generateDMMF(options.schemaPath)

  if (options.usePgLite) {
    const { PGlite } = await import("@electric-sql/pglite")
    const { PrismaPGlite } = await import("pglite-prisma-adapter")

    class PrismaClientMocked extends options.PrismaClient {
      pglite: InstanceType<typeof PGlite>
      adapter: InstanceType<typeof PrismaPGlite>
      datamodel: DMMF.Document
      prismockData: PrismockData

      constructor(...args: any[]) {
        const pglite = new PGlite("memory://", {
          relaxedDurability: true,
          initialMemory: 1024 * 1024 * 1024, // 1GB
        })
        const adapter = new PrismaPGlite(pglite)

        const inputPrismaOptions = args[0] ?? {}

        const { datasourceUrl: _datasourceUrl, ...prismaOptions } = inputPrismaOptions

        super({ ...prismaOptions, adapter })

        this.pglite = pglite
        this.adapter = adapter
        this.datamodel = datamodel
        this.prismockData = getPgLitePrismockData({
          schemaPath: options.schemaPath,
          pglite,
          adapter,
          datamodel,
          prismaClient: this,
        })
      }

      async $connect(): runtime.JsPromise<void> {
        await this.reset()

        return super.$connect()
      }

      async reset() {
        await this.prismockData.reset()
      }

      async getData() {
        return this.prismockData.getData()
      }

      async setData(data: Data) {
        return this.prismockData.setData(data)
      }
    }

    return PrismaClientMocked as PrismaClientClassMocked<PrismaClientType>
  }

  class PrismaClientMocked extends Prismock {
    protected constructor() {
      super(options.schemaPath)
    }
  }

  return PrismaClientMocked as unknown as PrismaClientClassMocked<PrismaClientType>
}

export async function getDefaultClient() {
  const { PrismaClient } = await import("@prisma/client")

  return await getClient({
    prismaClient: PrismaClient,
    schemaPath: "./prisma/schema.prisma",
    usePgLite: process.env.PRISMOCK_USE_PG_LITE ? true : undefined,
  })
}

export async function getDefaultClientClass() {
  const { PrismaClient } = await import("@prisma/client")

  return await getClientClass({
    PrismaClient: PrismaClient,
    schemaPath: "./prisma/schema.prisma",
    usePgLite: process.env.PRISMOCK_USE_PG_LITE ? true : undefined,
  })
}

/**
 * For backwards compatibility
 */

export const createPrismock = getDefaultClient
export const createPrismockClass = getDefaultClientClass
