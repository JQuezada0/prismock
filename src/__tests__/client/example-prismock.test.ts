import { describe, it, expect, vi, beforeAll } from 'vitest'
import * as Client from "../../lib/client"

vi.doMock("@prisma/client", async () => {
  const actualPrisma = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");

  return {
    ...actualPrisma,
    PrismaClient: await Client.createPrismockClass(),
  };
})


describe('Example', () => {
  let provider: string;

  beforeAll(async () => {
    const { fetchProvider } = await import('../../lib/prismock');
    provider = await fetchProvider();
  });

  describe('With mock', () => {
    it('Should use prismock instead of prisma', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const { buildUser, formatEntries, formatEntry } = await import('../../../testing');

      const prisma = new PrismaClient();

      await prisma.$connect()

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });

    it('Should allow mocking queries', async () => {
      if (provider === 'postgresql') {
        const { PrismaClient } = await import('@prisma/client')

        const prisma = new PrismaClient();

        vi.spyOn(prisma, '$queryRaw').mockResolvedValue(42);

        return expect(prisma.$queryRaw`SOME QUERIES`).resolves.toBe(42);
      }
    });
  });
});
