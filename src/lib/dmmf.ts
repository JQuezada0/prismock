import * as path from 'path';

const PrismaInternals = await import('@prisma/internals');

const { getDMMF, getSchema } = PrismaInternals;

export async function generateDMMF(schemaPath?: string) {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  const datamodel = await getSchema(pathToModule);
  return getDMMF({ datamodel });
}