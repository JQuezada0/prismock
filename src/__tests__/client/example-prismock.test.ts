import { it } from 'vitest'
import { describe } from "../../../testing/helpers"

describe('Example', async () => {
  const { vi } = await import("vitest")

  const Client = await import("../../lib/client")

  vi.doMock("@prisma/client", async () => {
    const actualPrisma = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  
    const PrismaClient = await Client.getClientClass({
      PrismaClient: actualPrisma.PrismaClient,
      schemaPath: "./prisma/schema.prisma",
      usePgLite: process.env.PRISMOCK_USE_PG_LITE ? true : undefined,
    })
  
    return {
      ...actualPrisma,
      PrismaClient,
    };
  })
  
  const { fetchProvider } = await import('../../lib/prismock');
  const provider: string = await fetchProvider();

  describe('With mock', ({ databaseUrl }) => {
    it('Should use prismock instead of prisma', async ({ expect }) => {
      const { PrismaClient } = await import('@prisma/client')
      const { buildUser, formatEntries, formatEntry } = await import('../../../testing');

      const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

      await prisma.$connect()

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });

    it('Should allow mocking queries', async ({ expect }) => {
      if (provider === 'postgresql') {
        const { PrismaClient } = await import('@prisma/client')

        const prisma = new PrismaClient();

        vi.spyOn(prisma, '$queryRaw').mockResolvedValue(42);

        return expect(prisma.$queryRaw`SOME QUERIES`).resolves.toBe(42);
      }
    });
  });
});
