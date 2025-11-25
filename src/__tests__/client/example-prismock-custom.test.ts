import { buildUser, formatEntries, formatEntry } from '../../../testing';
import { describe, it, expect, beforeAll, vi } from "vitest"
import { createRequire } from "node:module";

const require = createRequire(import.meta.url)

// This path existing depends on <rootDir>/testing/global-setup.ts running properly.
vi.mock('@prisma-custom/client', async () => {
  console.log(`Mocking PrismaClient from`);
  const actual = await vi.importActual<typeof import('.prisma-custom/client')>('@prisma-custom/client');
  return {
    ...actual,
    PrismaClient: await (await vi.importActual<typeof import('../../lib/client')>('../../lib/client')).createPrismockClass(actual.Prisma),
  };
});

describe('Example', () => {
  describe('With mock', () => {
    it('Should use prismock instead of prisma', async () => {
      // @ts-expect-error - this is an aliased path
      const { PrismaClient } = await import('@prisma-custom/client');
      const prisma = new PrismaClient();

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });
  });
});
