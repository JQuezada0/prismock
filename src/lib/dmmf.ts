import type { DMMF } from '@prisma/generator-helper-v7';
import type { ConfigMetaFormat } from '@prisma/internals/dist/engine-commands/getConfig';
import * as path from 'path';

export async function generateDMMF(schemaPath?: string): Promise<DMMF.Document> {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));

  return await (async () => {
    if (PRISMA_MAJOR_VERSION === "6") {
      const { getSchemaWithPath: getSchemaWithPathV6, getDMMF: getDMMFV6 } = (await import("@prisma/internals-v6")).default
      const schemas = await getSchemaWithPathV6(pathToModule)

      return await getDMMFV6({ datamodel: schemas.schemas })
    }

    const { getSchemaWithPath: getSchemaWithPathV7, getDMMF: getDMMFV7 } = (await import("@prisma/internals-v7")).default
      const schema =  await getSchemaWithPathV7({
        schemaPath: {
          configProvidedPath: pathToModule,
        }
      })

      return await getDMMFV7({ datamodel: schema.schemas })
  })()
}

export async function generateConfig(schemaPath: string): Promise<ConfigMetaFormat> {
  if (PRISMA_MAJOR_VERSION === "6") {
    const { getSchemaWithPath: getSchemaWithPathV6, getConfig: getConfigV6 } = (await import("@prisma/internals-v6")).default
    const schemas = await getSchemaWithPathV6(schemaPath)
    return await getConfigV6({ datamodel: schemas.schemas })
  }

  const { getSchemaWithPath: getSchemaWithPathV7, getConfig: getConfigV7 } = (await import("@prisma/internals-v7")).default
  const schema = await getSchemaWithPathV7({
    schemaPath: {
      configProvidedPath: schemaPath,
    }
  })

  return await getConfigV7({ datamodel: schema.schemas })
}
