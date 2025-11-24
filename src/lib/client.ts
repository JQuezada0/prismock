import type { PrismaClient } from '@prisma/client';
import type { DMMF } from '@prisma/generator-helper';
import type * as runtime from '@prisma/client/runtime/library';

import { Delegate } from './delegate';
import { Data, Delegates, generateDelegates } from './prismock';
import { applyExtensions, type ExtensionsDefinition } from './extensions';

type GetData = () => Data;
type SetData = (data: Data) => void;

interface PrismockData {
  getData: GetData;
  setData: SetData;
  reset: () => void;
}
export type PrismockClientType<T = PrismaClient> = T & PrismockData;

type TransactionArgs<T> = (tx: Omit<T, '$transaction'>) => unknown | Promise<unknown>[];

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

type PrismaModule<PC = PrismaClient> = {
  dmmf: runtime.BaseDMMF;
};

class Prismock<PC> {
  __prismaModule: PrismaModule<PC>;

  private constructor(prismaModule: PrismaModule<PC>) {
    this.__prismaModule = prismaModule;
    this.generate();
  }

  static async create<PC = PrismaClient>(prismaModule: PrismaModule<PC>) {
    return new Prismock(prismaModule);
  }

  static async createDefault() {
    const { Prisma, PrismaClient } = await import("@prisma/client")

    return new Prismock<InstanceType<typeof PrismaClient>>(Prisma);
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

export async function createPrismock() {
  return await Prismock.createDefault()
}

export async function createPrismockClient<PC = PrismaClient>(prismaModule: PrismaModule<PC>) {
  return await Prismock.create(prismaModule);
}
