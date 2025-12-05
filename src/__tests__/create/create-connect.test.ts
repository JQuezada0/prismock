import { resetDb, seededPosts, simulateSeed } from '../../../testing';
// import { createPrismock, PrismockClientType } from '../../lib/client';
import { describe, expect, beforeAll } from "vitest"
import { it } from "../../../testing/helpers"
import type { PrismockClientType } from '../../lib/client';
import type { PrismaClient } from '@prisma/client';

describe('create (connect)', () => {
  // let prismock: PrismockClientType;
  // let prisma: PrismaClient;

  // beforeAll(async () => {
  //   await resetDb();

  //   // prisma = new PrismaClient();
  //   // prismock = await createPrismock()
  //   // await simulateSeed(prismock);
  // });

  // it.beforeEach(async ({ prismock, prisma }) => {
  //   await simulateSeed(prismock);
  //   await simulateSeed(prisma);
  // });

  it('Should create with multiple dependencies and connect to it', async ({ isolated }) => {
    await isolated(async ({ prisma, prismock, seedData }) => {
      await seedData()

      const expected = {
        id: expect.anything(),
        title: 'title-create-connect-multiple',
      };
  
      const mockBlog = await prismock.blog.create({
        data: {
          title: 'title-create-connect-multiple',
          posts: {
            connect: [{ title: seededPosts[0].title }],
          },
          category: 'connect',
        },
        select: {
          id: true,
          title: true,
        },
      });
  
      const realBlog = await prisma.blog.create({
        data: {
          title: 'title-create-connect-multiple',
          posts: {
            connect: [{ title: seededPosts[0].title }],
          },
          category: 'connect',
        },
        select: {
          id: true,
          title: true,
        },
      });
  
      expect(realBlog).toEqual(expected);
      expect(mockBlog).toEqual(expected);
    })
  });

  it('Should create with dependency and connect to it', async ({ isolated }) => {
    await isolated(async ({ prisma, prismock, seedData }) => {
      await seedData()

      const expected = {
        id: expect.anything(),
        title: 'title-create-connect-single',
      };
  
      const mockBlog = await prismock.blog.create({
        data: {
          title: 'title-create-connect-single',
          posts: {
            connect: { title: seededPosts[0].title },
          },
          category: 'connect-single',
        },
        select: {
          id: true,
          title: true,
        },
      });
  
      const realBlog = await prisma.blog.create({
        data: {
          title: 'title-create-connect-single',
          posts: {
            connect: { title: seededPosts[0].title },
          },
          category: 'connect-single',
        },
        select: {
          id: true,
          title: true,
        },
      });
  
      expect(realBlog).toEqual(expected);
      expect(mockBlog).toEqual(expected);
    })
  });
});
