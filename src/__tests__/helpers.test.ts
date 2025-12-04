import { afterAll, beforeAll, describe } from "vitest"
import { it } from "../../testing/helpers"
import { resetDb } from "../../testing"

describe("helpers", () => {
  beforeAll(async () => {
    await resetDb()
  })

  it("hello world 1", async ({ prisma, prismock, isolated }) => {
    const userCreateOptions = {
      data: {
        email: "test@test.com",
        password: "password",
      },
    }

    await prismock.user.create(userCreateOptions)
    await prisma.user.create(userCreateOptions)

    await isolated(async ({ prisma, prismock }) => {
      await prismock.user.create(userCreateOptions)
      await prisma.user.create(userCreateOptions)
    })
  })
  
  it("hello world 2", async ({ prisma, prismock, isolated }) => {
    const userCreateOptions = {
      data: {
        email: "test2@test.com",
        password: "password",
      },
    }

    await prismock.user.create(userCreateOptions)
    await prisma.user.create(userCreateOptions)

    await isolated(async ({ prisma, prismock }) => {
      await prismock.user.create(userCreateOptions)
      await prisma.user.create(userCreateOptions)
    })
  })
})
