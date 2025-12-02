import type { DMMF } from '@prisma/generator-helper';
import type { ConfigMetaFormat } from '@prisma/internals/dist/engine-commands/getConfig';
import * as path from 'path';

const PrismaInternals = await import('@prisma/internals');

const { getDMMF, getSchemaWithPath, getConfig } = PrismaInternals.default;

export async function generateDMMF(schemaPath?: string): Promise<DMMF.Document> {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  const datamodel = await getSchemaWithPath(pathToModule);
  
  return await getDMMF({ datamodel: datamodel.schemas })
}

export async function generateConfig(schemaPath: string): Promise<ConfigMetaFormat> {
  const datamodel = await getSchemaWithPath(schemaPath);
  const config = await getConfig({ datamodel: datamodel.schemas });
  return config
}
