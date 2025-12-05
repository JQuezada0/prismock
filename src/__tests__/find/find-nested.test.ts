import { seededBlogs, seededUsers, simulateSeed } from '../../../testing';
import { it, expect, beforeAll } from "vitest"
import { describe } from "../../../testing/helpers"

describe('find', ({ prisma, prismock }) => {
  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);
  });

  it('Should return elements with nested find', async () => {
    const expected = [{ title: seededBlogs[0].title }];

    const realArticles = await prisma.blog.findMany({
      where: {
        posts: {
          some: {
            author: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select: {
        title: true,
      },
    });

    const mockArticles = await prismock.blog.findMany({
      where: {
        posts: {
          some: {
            author: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select: {
        title: true,
      },
    });

    expect(realArticles).toEqual(expected);
    expect(mockArticles).toEqual(expected);
  });
});
