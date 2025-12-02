import { PrismaClient } from '@prisma/client';
import type { DMMF } from '@prisma/generator-helper';
import type * as runtime from '@prisma/client/runtime/library';

import type { Delegate, Item } from './delegate';
import { Data, Delegates, generateDelegates } from './prismock';
import { applyExtensions, type ExtensionsDefinition } from './extensions';
import { execSync } from 'child_process';
import { generateDMMF } from './dmmf';
import { camelize } from './helpers';

type GetData = () => Promise<Data>;
type SetData = (data: Data) => Promise<void>;

export interface PrismockData {
  getData: GetData;
  setData: SetData;
  reset: () => void;
}
export type PrismockClientType<T = PrismaClient> = T & PrismockData;

type TransactionArgs<T> = (tx: Omit<T, '$transaction'>) => unknown | Promise<unknown>[];

export type PrismockOptions = {
  usePgLite?: undefined | null | {
    schemaPath: string
  }
}

export class Prismock<PC = PrismaClient> {
  __prismaModule: PrismaModule<PC>;

  protected constructor(prismaModule: PrismaModule<PC>) {
    this.__prismaModule = prismaModule;
    this.generate();
  }

  static async create<PC = PrismaClient>(prismaModule: PrismaModule<PC>) {
    return (new Prismock<PC>(prismaModule)) as unknown as PrismockClientType<PC>;
  }

  static async createDefault() {
    const { Prisma, PrismaClient } = await import("@prisma/client")

    return new Prismock<InstanceType<typeof PrismaClient>>(Prisma) as unknown as (PrismaClient & PrismockData);
  }

  reset() {
    this.generate();
  }

  private generate() {
    const { delegates, setData, getData } = generateDelegates({ models: this.__prismaModule.dmmf.datamodel.models as DMMF.Model[] });

    Object.entries({ ...delegates, setData, getData }).forEach(([key, value]) => {
      if (key in this) Object.assign((this as unknown as Delegates)[key], value);
      else Object.assign(this, { [key]: value });
    });
  }

  async $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }

  $on() {}

  $use() {
    return this;
  }

  $executeRaw() {
    return Promise.resolve(0);
  }

  $executeRawUnsafe() {
    return Promise.resolve(0);
  }

  $queryRaw() {
    return Promise.resolve([]);
  }

  $queryRawUnsafe() {
    return Promise.resolve([]);
  }

  $extends(extensionDefs: ExtensionsDefinition) {
    return applyExtensions(this as unknown as PrismaClient, extensionDefs);
  }

  async $transaction(args: any) {
    if (Array.isArray(args)) {
      return Promise.all(args);
    }

    return args(this);
  }
}

export function generateClient<T = PrismaClient>(delegates: Record<string, Delegate>, getData: GetData, setData: SetData) {
  // eslint-disable-next-line no-console
  console.log(
    'Deprecation notice: generatePrismock and generatePrismockSync should be replaced with PrismockClient. See https://github.com/morintd/prismock/blob/master/docs/generate-prismock-deprecated.md',
  );

  const client = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $on: () => {},
    $use: () => {},
    $executeRaw: () => Promise.resolve(0),
    $executeRawUnsafe: () => Promise.resolve(0),
    $queryRaw: () => Promise.resolve([]),
    $queryRawUnsafe: () => Promise.resolve([]),
    getData,
    setData,
    ...delegates,
  } as unknown as PrismockClientType<T>;

  return {
    ...client,
    $transaction: async (args: TransactionArgs<T>) => {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }

      return args(client);
    },
  } as unknown as PrismockClientType<T>;
}

export type PrismaModule<PC = PrismaClient> = {
  dmmf: runtime.BaseDMMF;
};

export async function createPrismockClass<PC extends (new (...args: any[]) => any)  = typeof PrismaClient>(prismaModuleInput?: PrismaModule, options: PrismockOptions = {}) {
  if (options.usePgLite) {
    return await generatePgLitePrismockClass(options.usePgLite.schemaPath)
  }

  const prismaModule = await (async () => {
    if (prismaModuleInput) {
      return prismaModuleInput
    }

    const { Prisma } = await import("@prisma/client")
    return Prisma
  })()

  const c = class PrismockClientDefault extends Prismock<InstanceType<PC>> {
    protected constructor() {
      super(prismaModule);
    }
  }

  return c as unknown as typeof PrismaClient;
}

function defaultPrismockOptions(): PrismockOptions {
  if (process.env.PRISMOCK_USE_PG_LITE) {
    return {
      usePgLite: {
        schemaPath: "./prisma/schema.prisma",
      }
    }
  }

  return {}
}

export async function createPrismock(options: PrismockOptions = defaultPrismockOptions()) {
  if (options.usePgLite) {
    return await generatePgLitePrismock(options.usePgLite.schemaPath)
  }

  return await Prismock.createDefault()
}

export async function createPrismockClient<PC = PrismaClient>(prismaModule: PrismaModule<PC>, options: PrismockOptions = defaultPrismockOptions()) {
  if (options.usePgLite) {
    return await generatePgLitePrismock(options.usePgLite.schemaPath)
  }

  return await Prismock.create(prismaModule)
}

export async function generatePgLitePrismock(schemaPath: string): Promise<PrismockClientType<PrismaClient>> {
  const { PGlite } = await import("@electric-sql/pglite")
  const { PrismaPGlite } = await import("pglite-prisma-adapter")

  const pglite = new PGlite()

  const instance = new PrismaPGlite(pglite)

  const adapter = await instance.connect()

  const prisma = new PrismaClient({
    adapter: instance,
  })

  const datamodel = await generateDMMF(schemaPath);

  const sql = execSync(
    `bun prisma migrate diff --from-empty --to-schema-datamodel=${schemaPath} --script`,
    { encoding: 'utf-8' }
  );

  const reset = async () => {
    await pglite.exec(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
    
    // Re-run the create script
    await adapter.executeScript(sql);
  }

  await reset()

  const client = Object.assign(prisma, {
    reset,
    getData: async () => {
      const data: Data = {}

      for (const model of datamodel.datamodel.models) {
        const tableName = model.dbName ?? model.name

        const idColumn = model.fields.find((field) => field.isId)

        const defaultOrderBy = []

        if (idColumn) {
          defaultOrderBy.push({ [idColumn.dbName ?? idColumn.name]: 'asc' })
        }

        const orderBy = model.primaryKey?.fields.map((field) => ({ [field]: 'asc' as "asc" | "desc" })) ?? defaultOrderBy

        // @ts-expect-error - model name
        const items = await prisma[camelize(model.name) as keyof typeof prisma].findMany({
          orderBy,
        })

        data[camelize(model.name)] = items
      }

      return data
    },
    setData: async (data: Data) => {
      for (const model in data) {
        const items = data[model]

        const prismaModel = datamodel.datamodel.models.find((m) => camelize(m.name) === camelize(model) || m.dbName === model)

        if (!prismaModel) {
          continue
        }

        const tableName = prismaModel.dbName ?? prismaModel.name

        // @ts-expect-error - model name
        await prisma[camelize(model) as keyof typeof prisma].createMany({
          data: items,
        })
      }
    },
  })

  return client
}

export async function generatePgLitePrismockClass(schemaPath: string) {
  const { PGlite } = await import("@electric-sql/pglite")
  const { PrismaPGlite } = await import("pglite-prisma-adapter")

  return class PrismockClient extends PrismaClient {
    pglite: InstanceType<typeof PGlite>
    adapter: InstanceType<typeof PrismaPGlite>
    
    constructor() {
      const pglite = new PGlite()
      const adapter = new PrismaPGlite(pglite)

      super({ adapter })

      this.pglite = pglite
      this.adapter = adapter
    }

    async $connect(): runtime.JsPromise<void> {
      await this.reset()
      return super.$connect()
    }

    async reset() {
      const sql = execSync(
        `bunx prisma migrate diff --from-empty --to-schema-datamodel=${schemaPath} --script`,
        { encoding: 'utf-8' }
      );

      await this.pglite.exec(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
      `);

      // Re-run the create script
      await this.pglite.exec(sql);
    }
  }
}
