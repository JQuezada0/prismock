import type { Prisma, PrismaClient } from '@prisma/client';
import { applyModelExtensions } from './model';
import { applyQueryExtensions } from './query';
import { applyResultExtensions } from './result';
import type { ExtendsHook, DefaultArgs } from '@prisma/client/runtime/library';
import type { PrismaDMMF } from '../globals';
import type { DMMF as DMMFV7 } from '@prisma/generator-helper-v7';
import type { DMMF as DMMFV6 } from '@prisma/generator-helper-v6';

export { applyModelExtensions, applyQueryExtensions, applyResultExtensions };

export type ExtensionsDefinition = Parameters<ExtendsHook<"define", Prisma.TypeMapCb, DefaultArgs>>[0];

export function applyExtensions(client: PrismaClient, extensions: ExtensionsDefinition, datamodel: DMMFV7.Document | DMMFV6.Document, PrismaDMMF: PrismaDMMF) {
  const resultExtended = applyResultExtensions(client, extensions, datamodel, PrismaDMMF);
  const queryExtended = applyQueryExtensions(resultExtended, extensions);
  const modelExtended = applyModelExtensions(queryExtended, extensions);

  return modelExtended
}
