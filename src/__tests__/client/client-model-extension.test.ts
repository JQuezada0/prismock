import { Prisma } from "@prisma/client"
import { createPrismock } from "../../lib/client"
import { mockDeep } from "vitest-mock-extended"
import { describe, it, expect, beforeAll } from "vitest"

describe("client-model-extension", () => {
  describe("model extension", async () => {
    it("should work with extension definition as object", async () => {
      const prismock = await createPrismock()

      const extensions = {
        model: {
          user: {
            findManyExtended: () => {
              const user = mockDeep<Prisma.$UserPayload['scalars']>({
                // @ts-expect-error - id is a string in mongodb and a number in postgres
                id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
                email: "extendedClient@foobar.com",
              })
      
              return [user]
            },
          },
        }
      }

      const extendedPrismock = prismock.$extends(extensions)

      const users = extendedPrismock.user.findManyExtended()

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
        email: "extendedClient@foobar.com",
      })
    })
    
    it("should work with extension definition as function", async () => {
      const prismock = await createPrismock()

      const extensions = Prisma.defineExtension((client) => {
        return client.$extends({
          model: {
            user: {
              findManyExtended: () => {
                const user = mockDeep<Prisma.$UserPayload['scalars']>({
                  // @ts-expect-error - id is a string in mongodb and a number in postgres
                  id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
                  email: "extendedClient@foobar.com",
                })
        
                return [user]
              },
            },
          }
        })
      })

      const extendedPrismock = prismock.$extends(extensions)

      const users = extendedPrismock.user.findManyExtended()

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
        email: "extendedClient@foobar.com",
      })
    })
  })
})