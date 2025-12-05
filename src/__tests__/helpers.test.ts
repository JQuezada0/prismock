import { afterAll, beforeAll } from "vitest"
import { it } from "../../testing/helpers"
import { resetDb, simulateSeed } from "../../testing"
import { describe } from "../../testing/helpers"

describe("helpers", ({ prisma, prismock }) => {
  beforeAll(async () => {
    await simulateSeed(prisma)
    await simulateSeed(prismock)
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
