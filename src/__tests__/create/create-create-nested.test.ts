import type { PrismaClient } from "@prisma/client"
import { Gender } from "@prisma/client"
import { describe, expect } from "vitest"
import { it } from "../../../testing/helpers"
import { buildUser, formatEntry, simulateSeed } from "../../../testing"
import { PrismockClientType } from "../../lib/client"

describe("create", () => {
  const seedData = async ({ prisma, prismock }: { prisma: PrismaClient; prismock: PrismockClientType }) => {
    await simulateSeed(prisma)
    await simulateSeed(prismock)

    const realBlog = (await prisma.blog.findUnique({ where: { title: "blog-1" } }))!
    const mockBlog = (await prismock.blog.findUnique({ where: { title: "blog-1" } }))!

    const realUser = await prisma.user.create({
      data: {
        email: "user4@company.com",
        password: "password",
        warnings: 0,
        posts: {
          createMany: {
            data: [
              {
                title: "title-user4",
                blogId: realBlog.id,
              },
            ],
          },
        },
      },
    })

    const mockUser = await prismock.user.create({
      data: {
        email: "user4@company.com",
        password: "password",
        warnings: 0,
        posts: {
          createMany: {
            data: [
              {
                title: "title-user4",
                blogId: mockBlog.id,
              },
            ],
          },
        },
      },
    })

    return {
      realUser,
      mockUser,
      realBlog,
      mockBlog,
    }
  }

  describe("createMany (nested)", () => {
    it("Should return created user", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        const { realUser, mockUser } = await seedData({ prisma, prismock })
        const expected = buildUser(4, {})

        expect(formatEntry(realUser)).toEqual(formatEntry(expected))
        expect(formatEntry(mockUser)).toEqual(formatEntry(expected))
      })
    })

    it("Should create nested post", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        const { realUser, mockUser, realBlog, mockBlog } = await seedData({ prisma, prismock })

        const realPost = (await prisma.post.findUnique({
          where: { title: "title-user4" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!

        const mockPost = (await prismock.post.findUnique({
          where: { title: "title-user4" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!

        expect(formatEntry(realPost)).toEqual({
          title: "title-user4",
          authorId: realUser.id,
          blogId: realBlog.id,
        })
        expect(formatEntry(mockPost)).toEqual({
          title: "title-user4",
          authorId: mockUser.id,
          blogId: mockBlog.id,
        })
      })
    })
  })

  describe("create (nested)", () => {
    const seedData = async ({ prisma, prismock }: { prisma: PrismaClient; prismock: PrismockClientType }) => {
    await simulateSeed(prisma)
    await simulateSeed(prismock)

    const realBlog = (await prisma.blog.findUnique({ where: { title: "blog-1" } }))!
    const mockBlog = (await prismock.blog.findUnique({ where: { title: "blog-1" } }))!

      const realUser = await prisma.user.create({
        data: {
          email: "user4@company.com",
          password: "password",
          warnings: 0,
          posts: {
            create: [
              {
                title: "title-user4",
                blogId: realBlog.id,
              },
              {
                title: "title-user4-2",
                blogId: realBlog.id,
              },
            ],
          },
        },
      })

      const mockUser = await prismock.user.create({
        data: {
          email: "user4@company.com",
          password: "password",
          warnings: 0,
          posts: {
            create: [
              {
                title: "title-user4",
                blogId: mockBlog.id,
              },
              {
                title: "title-user4-2",
                blogId: mockBlog.id,
              },
            ],
          },
        },
      })

      return {
        realUser,
        mockUser,
        realBlog,
        mockBlog,
      }
    }

    it("Should return created user", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        const { realUser, mockUser } = await seedData({ prisma, prismock })

        const expected = buildUser(4, {})

        expect(formatEntry(realUser)).toEqual(formatEntry(expected))
        expect(formatEntry(mockUser)).toEqual(formatEntry(expected))
      })
    })

    it("Should create nested post", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        const { realUser, mockUser, mockBlog, realBlog } = await seedData({ prisma, prismock })

        const realPost = (await prisma.post.findUnique({
          where: { title: "title-user4" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!
        const realPost2 = (await prisma.post.findUnique({
          where: { title: "title-user4-2" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!

        const mockPost = (await prismock.post.findUnique({
          where: { title: "title-user4" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!

        const mockPost2 = (await prismock.post.findUnique({
          where: { title: "title-user4-2" },
          select: {
            title: true,
            authorId: true,
            blogId: true,
          },
        }))!

        expect(formatEntry(realPost)).toEqual({
          title: "title-user4",
          authorId: realUser.id,
          blogId: realBlog.id,
        })
        expect(formatEntry(realPost2)).toEqual({
          title: "title-user4-2",
          authorId: realUser.id,
          blogId: realBlog.id,
        })

        expect(formatEntry(mockPost)).toEqual({
          title: "title-user4",
          authorId: mockUser.id,
          blogId: mockBlog.id,
        })
        expect(formatEntry(mockPost2)).toEqual({
          title: "title-user4-2",
          authorId: mockUser.id,
          blogId: mockBlog.id,
        })
      })
    })
  })

  describe("create (nested) single", () => {
    const userToCreate = {
      gender: Gender.MALE,
      bio: "user single bio",
      user: {
        create: {
          email: "user-single@company.com",
          password: "password",
        },
      },
    }

    const seedProfiles = async ({ prisma, prismock }: { prisma: PrismaClient; prismock: PrismockClientType }) => {
      await prisma.profile.create({ data: userToCreate })
      await prismock.profile.create({ data: userToCreate })
    }

    it("Should create given user", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        const realUser = await prisma.user.findFirst({
          where: { email: userToCreate.user.create.email },
          select: {
            email: true,
            password: true,
          },
        })

        const mockUser = await prismock.user.findFirst({
          where: { email: userToCreate.user.create.email },
          select: {
            email: true,
            password: true,
          },
        })

        expect(realUser).toEqual(mockUser)
      })
    })

    it("Should create profile with given user", async ({ isolated }) => {
      await isolated(async ({ prisma, prismock }) => {
        await seedProfiles({ prisma, prismock })
        const realUser = await prisma.user.findFirst({ where: { email: userToCreate.user.create.email } })
        const mockUser = await prismock.user.findFirst({ where: { email: userToCreate.user.create.email } })

        const realProfile = await prisma.profile.findFirst({
          where: { bio: userToCreate.bio },
          select: { bio: true, gender: true, userId: true },
        })
        const mockProfile = await prismock.profile.findFirst({
          where: { bio: userToCreate.bio },
          select: { bio: true, gender: true, userId: true },
        })

        expect(realProfile).toEqual({
          bio: userToCreate.bio,
          gender: userToCreate.gender,
          userId: realUser!.id,
        })

        expect(mockProfile).toEqual({
          bio: userToCreate.bio,
          gender: userToCreate.gender,
          userId: mockUser!.id,
        })
      })
    })
  })
})
