import { seededPosts, seededUsers, simulateSeed } from '../../../testing';
import { it } from "vitest"
import { describe } from "../../../testing/helpers"

describe('update (connectOrCreate)', ({ prisma, prismock, beforeAll }) => {
  const select = {
    title: true,
    author: {
      select: {
        email: true,
      },
    },
  };

  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);
  });

  it('Should update and connect to existing', async ({ expect }) => {
    const mockPost = await prismock.post.update({
      data: {
        title: 'title-connect',
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[1].email,
              password: seededUsers[1].password,
            },
            where: {
              email: seededUsers[1].email,
            },
          },
        },
      },
      select,
      where: {
        title: seededPosts[0].title,
      },
    });

    const realPost = await prisma.post.update({
      data: {
        title: 'title-connect',
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[1].email,
              password: seededUsers[1].password,
            },
            where: {
              email: seededUsers[1].email,
            },
          },
        },
      },
      select,
      where: {
        title: seededPosts[0].title,
      },
    });

    expect(realPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[1].email,
      },
    });
    expect(mockPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[1].email,
      },
    });
  });

  it('Should update with dependencies and connect to it', async ({ expect }) => {
    const mockPost = await prismock.post.update({
      data: {
        title: 'title-connect-create',
        author: {
          connectOrCreate: {
            create: {
              email: 'new@user.com',
              password: 'password',
            },
            where: {
              email: 'new@user.com',
            },
          },
        },
      },
      where: {
        title: seededPosts[1].title,
      },
      select,
    });
    const mockAuthor = await prismock.user.findUnique({ where: { email: 'new@user.com' } });

    const realPost = await prisma.post.update({
      data: {
        title: 'title-connect-create',
        author: {
          connectOrCreate: {
            create: {
              email: 'new@user.com',
              password: 'password',
            },
            where: {
              email: 'new@user.com',
            },
          },
        },
      },
      where: {
        title: seededPosts[1].title,
      },
      select,
    });
    const realAuthor = await prisma.user.findUnique({ where: { email: 'new@user.com' } });

    expect(realPost).toEqual({
      title: 'title-connect-create',
      author: {
        email: 'new@user.com',
      },
    });
    expect(realAuthor).toBeDefined();

    expect(mockPost).toEqual({
      title: 'title-connect-create',
      author: {
        email: 'new@user.com',
      },
    });
    expect(mockAuthor).toBeDefined();
  });
});
