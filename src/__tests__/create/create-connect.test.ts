import { seededPosts } from '../../../testing';
import { describe, expect } from "vitest"
import { it } from "../../../testing/helpers"

describe('create (connect)', () => {
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
