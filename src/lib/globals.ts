export type PrismaDMMF = Awaited<ReturnType<typeof getGlobals>>["DMMF"]

export async function getGlobals() {
  const { PrismaClientKnownRequestError, Decimal } = await import("@prisma/client-runtime-utils")

  const DMMF = await (async () => {
    if (PRISMA_MAJOR_VERSION === "7") {
      return (await import("@prisma/dmmf-v7")).default
    }

    return (await import("@prisma/dmmf-v6")).default
  })()

  return {
    PrismaClientKnownRequestError,
    Decimal,
    DMMF,
  }
}
