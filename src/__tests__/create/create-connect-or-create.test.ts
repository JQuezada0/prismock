import { PrismaClient } from "@prisma/client"
import { describe } from "vitest"
import { it } from "../../../testing/helpers"
import { seededBlogs, seededUsers, simulateSeed } from "../../../testing"
import type { PrismockClientType } from "../../lib/client"

describe("create (connectOrCreate)", () => {
  const select = {
    title: true,
    author: {
      select: {
        email: true,
      },
    },
  }

  const seedData = async ({ prismock, prisma }: { prismock: PrismockClientType; prisma: PrismaClient }) => {
    await simulateSeed(prismock)
    await simulateSeed(prisma)
  }

  it("Should create and connect to existing", async ({ isolated, expect }) => {
    await isolated(async ({ prismock, prisma }) => {
      await seedData({ prismock, prisma })

      const mockPost = await prismock.post.create({
        data: {
          title: "title-connect",
          blog: {
            connect: {
              title: seededBlogs[0].title,
            },
          },
          author: {
            connectOrCreate: {
              create: {
                email: seededUsers[0].email,
                password: seededUsers[0].password,
              },
              where: {
                email: seededUsers[0].email,
              },
            },
          },
        },
        select,
      })

      const realPost = await prisma.post.create({
        data: {
          title: "title-connect",
          blog: {
            connect: {
              title: seededBlogs[0].title,
            },
          },
          author: {
            connectOrCreate: {
              create: {
                email: seededUsers[0].email,
                password: seededUsers[0].password,
              },
              where: {
                email: seededUsers[0].email,
              },
            },
          },
        },
        select,
      })

      expect(realPost).toEqual({
        title: "title-connect",
        author: {
          email: seededUsers[0].email,
        },
      })
      expect(mockPost).toEqual({
        title: "title-connect",
        author: {
          email: seededUsers[0].email,
        },
      })
    })
  })

  it("Should create with dependencies and connect to it", async ({ isolated, expect }) => {
    await isolated(async ({ prismock, prisma }) => {
      await seedData({ prismock, prisma })

      const mockPost = await prismock.post.create({
        data: {
          title: "title-connect-create",
          blog: {
            connect: {
              title: seededBlogs[0].title,
            },
          },
          author: {
            connectOrCreate: {
              create: {
                email: "new@user.com",
                password: "password",
              },
              where: {
                email: "new@user.com",
              },
            },
          },
        },
        select,
      })
      const mockAuthor = await prismock.user.findUnique({ where: { email: "new@user.com" } })

      const realPost = await prisma.post.create({
        data: {
          title: "title-connect-create",
          blog: {
            connect: {
              title: seededBlogs[0].title,
            },
          },
          author: {
            connectOrCreate: {
              create: {
                email: "new@user.com",
                password: "password",
              },
              where: {
                email: "new@user.com",
              },
            },
          },
        },
        select,
      })
      const realAuthor = await prisma.user.findUnique({ where: { email: "new@user.com" } })

      expect(realPost).toEqual({
        title: "title-connect-create",
        author: {
          email: "new@user.com",
        },
      })
      expect(realAuthor).toBeDefined()

      expect(mockPost).toEqual({
        title: "title-connect-create",
        author: {
          email: "new@user.com",
        },
      })
      expect(mockAuthor).toBeDefined()
    })
  })
})
