import type { Prisma, PrismaClient } from "@prisma/client"
import type { DefaultArgs, DynamicResultExtensionArgs, ExtendsHook, ModelKey } from "@prisma/client/runtime/library"
import type { DMMF } from "@prisma/generator-helper-v7"
import type { PrismaDMMF } from "../globals"

type ModelMap = {
  [K in Prisma.TypeMap["meta"]["modelProps"]]: Prisma.TypeMap["model"][ModelKey<
    Prisma.TypeMap,
    K
  >]["payload"]["scalars"]
}

type ResultExtensionModelMap = DynamicResultExtensionArgs<
  ModelMap & { $allModels: object },
  Prisma.TypeMap
>

function buildResultExtendedModel<ModelName extends keyof ModelMap>(
  client: PrismaClient,
  proxiedModels: {
    [K in Exclude<keyof ResultExtensionModelMap, "$allModels">]?: PrismaClient[K]
  },
  modelExtensions: ResultExtensionModelMap[ModelName],
  modelName: ModelName,
  PrismaDMMF: PrismaDMMF,
): PrismaClient[ModelName] {
  const model = proxiedModels[modelName] ?? client[modelName]

  if (Object.keys(modelExtensions).length === 0) {
    return model
  }

  const singleResultActions = [
    PrismaDMMF.ModelAction.findFirst,
    PrismaDMMF.ModelAction.findFirstOrThrow,
    PrismaDMMF.ModelAction.findUnique,
    PrismaDMMF.ModelAction.findUniqueOrThrow,
    PrismaDMMF.ModelAction.create,
    PrismaDMMF.ModelAction.update,
    PrismaDMMF.ModelAction.upsert,
  ] as const

  const multipleResultActions = [
    PrismaDMMF.ModelAction.findMany,
    PrismaDMMF.ModelAction.createManyAndReturn,
    // PrismaDMMF.ModelAction.updateManyAndReturn,
  ] as const

  const allResultActions = [...singleResultActions, ...multipleResultActions] as const
  type ProxiedActions = `${(typeof allResultActions)[number]}`

  const proxyMethod = <M extends keyof PrismaClient[ModelName] | DMMF.ModelAction>(actionName: M) => {
    if (!(actionName in model)) {
      return () => null
    }

    const modelMethod = actionName as keyof PrismaClient[ModelName]

    const method = model[modelMethod]

    if (typeof method !== "function") {
      return method
    }

    function attach(value: object) {
      const originalValue = value

      for (const key in modelExtensions) {
        const modelExtension = modelExtensions[key]

        /**
         * This is a computed field that has the same name as one that's already on the object,
         * proxy it so we can call compute and give it the original non-proxied value
         */
        if (key in value) {
          return new Proxy(value, {
            get(target, prop, _receiver) {
              if (prop !== key) {
                return target[prop as keyof typeof target]
              }

              return modelExtension?.compute(target as Parameters<typeof modelExtension.compute>[0])
            },
          })
        }

        Object.defineProperty(value, key, {
          get: () => modelExtension?.compute(originalValue as Parameters<typeof modelExtension.compute>[0]),
          configurable: true,
          enumerable: true,
        })
      }

      return value
    }

    return (...args: any[]) => {
      return method(...args).then((result: any) => {
        if (result === null || result === undefined) {
          return result
        }

        function comp(result: any) {
          if (typeof result !== "object") {
            return result
          }

          if (
            singleResultActions.includes(actionName as (typeof singleResultActions)[number]) &&
            !Array.isArray(result)
          ) {
            return attach(result)
          }

          if (
            multipleResultActions.includes(actionName as (typeof multipleResultActions)[number]) &&
            Array.isArray(result)
          ) {
            return result.map(attach)
          }

          return result
        }

        if ("then" in result) {
          return result.then(comp)
        }

        return comp(result)
      })
    }
  }

  const proxiedMethods: {
    [K in ProxiedActions]?: K extends keyof PrismaClient[ModelName] ? PrismaClient[ModelName][K] : never
  } = allResultActions.reduce(
    (acc, next) => ({
      ...acc,
      [next]: proxyMethod(next),
    }),
    {} as { [K in ProxiedActions]?: K extends keyof PrismaClient[ModelName] ? PrismaClient[ModelName][K] : never },
  )

  const proxiedModel = new Proxy(model, {
    get(target, prop, _receiver) {
      if (prop in proxiedMethods) {
        const v = proxiedMethods[prop as keyof typeof proxiedMethods]

        if (typeof v === "function") {
          return v.bind(target)
        }
      }

      return target[prop as keyof typeof target]
    },
  })

  return proxiedModel
}

export function applyResultExtensions(
  client: PrismaClient,
  extensions: Parameters<ExtendsHook<"define", Prisma.TypeMapCb, DefaultArgs>>[0],
  datamodel: DMMF.Document,
  PrismaDMMF: PrismaDMMF,
): PrismaClient {
  if (typeof extensions === "function") {
    type ExtendableClient = Parameters<typeof extensions>[0]
    const extendedClient = extensions(client as ExtendableClient)
    return extendedClient as PrismaClient
  }

  const resultExtendedModelMap = (extensions.result ?? {}) as ResultExtensionModelMap

  const extendedModels = Object.keys(
    resultExtendedModelMap,
  ) as (keyof typeof resultExtendedModelMap)[]

  const hasAllModelsExtension = extendedModels.some((model) => model === "$allModels")

  const proxiedModels: {
    [K in Exclude<keyof typeof resultExtendedModelMap, "$allModels">]?: PrismaClient[K]
  } = {}

  function proxyModel<
    ModelName extends Exclude<keyof typeof resultExtendedModelMap, "$allModels">,
  >(modelName: ModelName) {
    const originalModel = proxiedModels[modelName] ?? client[modelName]

    if (!originalModel) {
      return
    }

    const proxiedModel = buildResultExtendedModel(
      client,
      proxiedModels,
      resultExtendedModelMap[modelName],
      modelName,
      PrismaDMMF,
    )

    proxiedModels[modelName] = proxiedModel

    return proxiedModel
  }

  for (const modelName of extendedModels) {
    if (modelName === "$allModels") {
      continue
    }

    if (!(modelName in client)) {
      continue
    }

    proxyModel(modelName)
  }

  if (hasAllModelsExtension && resultExtendedModelMap["$allModels"]) {
    // TODO
    // const allModelsExtension = resultExtendedModelMap["$allModels"]

    for (const model of datamodel.datamodel.models) {
      const modelName = model.name

      if (!(modelName in client)) {
        continue
      }

      const proxiedModel = buildResultExtendedModel(
        client,
        proxiedModels,
        resultExtendedModelMap["$allModels"],
        modelName as Prisma.TypeMap["meta"]["modelProps"],
        PrismaDMMF,
      )

      proxiedModels[modelName as keyof typeof proxiedModels] = proxiedModel as any
    }
  }

  return new Proxy(client, {
    get(target, prop, _receiver) {
      if (prop in proxiedModels) {
        return proxiedModels[prop as keyof typeof proxiedModels]
      }

      return target[prop as keyof typeof target]
    },
  })
}
