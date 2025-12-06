import { Prisma } from '@prisma/client';

import { seededBlogs, seededPosts, seededUsers, simulateSeed } from '../../../testing';
import { fetchProvider } from '../../lib/prismock';
import { it } from "vitest"
import { describe } from "../../../testing/helpers"

describe('client', ({ prisma, prismock, reset, beforeAll }) => {
  let provider: string;

  async function reSeed() {
    await reset()
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    provider = await fetchProvider();
  }

  beforeAll(async () => {
    await reSeed();
  });

  it('Should handle $connect', async ({ expect }) => {
    await expect(prisma.$connect()).resolves.not.toThrow();
    await expect(prismock.$connect()).resolves.not.toThrow();
  });

  it('Should handle $disconnect', async ({ expect }) => {
    await expect(prisma.$disconnect()).resolves.not.toThrow();
    await expect(prismock.$disconnect()).resolves.not.toThrow();
  });

  it('Should handle $use', async ({ expect }) => {
    prisma.$use(async (params, next) => {
      const result = await next(params);
      return result;
    });

    prismock.$use(async (params, next) => {
      const result = await next(params);
      return result;
    });

    const realUsers = await prisma.user.findMany();
    const mockUsers = await prismock.user.findMany();

    expect(realUsers.length).toBe(3);
    expect(mockUsers.length).toBe(3);
  });

  it('Should handle $extends', async ({ expect }) => {
    prisma.$extends({});
    prismock.$extends({});

    const realUsers = await prisma.user.findMany();
    const mockUsers = await prismock.user.findMany();

    expect(realUsers.length).toBe(3);
    expect(mockUsers.length).toBe(3);
  });

  /* SQL only */
  it('Should handle executeRaw', async ({ expect }) => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle executeRawUnsafe', async ({ expect }) => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle $queryRaw', async ({ expect }) => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $queryRawUnsafe', async ({ expect }) => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $transaction', async ({ expect }) => {
    if (provider === 'postgresql') {
      await reSeed();

      await expect(prisma.$transaction([prisma.post.deleteMany()])).resolves.toEqual([{ count: seededPosts.length }]);
      await expect(prismock.$transaction([prismock.post.deleteMany()])).resolves.toEqual([{ count: seededPosts.length }]);

      await expect(
        prisma.$transaction((tx) =>
          tx.post.create({
            data: {
              title: 'title-transaction',
              authorId: seededUsers[0].id,
              blogId: seededBlogs[0].id,
            },
            select: {
              id: true,
              title: true,
              authorId: true,
              blogId: true,
            },
          }),
        ),
      ).resolves.toEqual({
        id: seededPosts.length + 1,
        title: 'title-transaction',
        authorId: seededUsers[0].id,
        blogId: seededBlogs[0].id,
      });

      await expect(
        prismock.$transaction((tx) =>
          tx.post.create({
            data: {
              title: 'title-transaction',
              authorId: seededUsers[0].id,
              blogId: seededBlogs[0].id,
            },
            select: {
              id: true,
              title: true,
              authorId: true,
              blogId: true,
            },
          }),
        ),
      ).resolves.toEqual({
        id: seededPosts.length + 1,
        title: 'title-transaction',
        authorId: seededUsers[0].id,
        blogId: seededBlogs[0].id,
      });
    }
  });

  /* MongoDB only */
  // it('Should handle $runCommandRaw', () => {});
  // it('Should handle findRaw', () => {});
  // it('Should handle aggregateRaw', () => {});
});
