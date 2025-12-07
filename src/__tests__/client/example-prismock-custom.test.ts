import { buildUser, formatEntries, formatEntry } from '../../../testing';
import { it, expect, vi } from "vitest"
import { describe } from "../../../testing/helpers"

// This path existing depends on <rootDir>/testing/global-setup.ts running properly.
vi.mock('@prisma-custom/client', async () => {
  console.log(`Mocking PrismaClient from`);
  const actual = await vi.importActual<typeof import('.prisma-custom/client')>('@prisma-custom/client');

  return {
    ...actual,
    PrismaClient: await (await vi.importActual<typeof import('../../lib/client')>('../../lib/client')).getClientClass({
      PrismaClient: actual.PrismaClient,
      schemaPath: "./prisma/schema.prisma",
      usePgLite: process.env.PRISMOCK_USE_PG_LITE ? true : false,
    }),
  };
});

describe('Example', () => {
  describe('With mock', ({ databaseUrl }) => {
    it('Should use prismock instead of prisma', async () => {
      // @ts-expect-error - this is an aliased path
      const { PrismaClient } = await import('@prisma-custom/client');
      const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

      await prisma.$connect()

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });
  });
});
