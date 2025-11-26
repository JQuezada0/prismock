import { Prisma, PrismaClient, Role } from "@prisma/client"
import { createPrismock, type PrismockClientType } from "../../lib/client"
import { mockDeep } from "vitest-mock-extended"
import { describe, it, expect, beforeAll } from "vitest"
import { resetDb } from "../../../testing"

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

      const user = mockDeep<Prisma.$UserPayload['scalars']>({
        // @ts-expect-error - id is a string in mongodb and a number in postgres
        id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
        email: "extendedClient@foobar.com",
      })

      const extensions = Prisma.defineExtension((client) => {
        return client.$extends({
          model: {
            user: {
              findManyExtended() {
                const userModel = Prisma.getExtensionContext(this)

                return userModel.findMany()
              },
            },
          }
        })
      })

      const extendedPrismock = prismock.$extends(extensions)

      await prismock.user.create({
        data: {
          email: "extendedClient@foobar.com",
          // @ts-expect-error - id is a string in mongodb and a number in postgres
          id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
          password: "password",
          role: Role.USER,
          warnings: 0,
          banned: false,
          money: BigInt(0),
          friends: 0,
          signal: null,
          parameters: {},
          birthday: null,
        },
      })

      const users = await extendedPrismock.user.findManyExtended()

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: process.env.TEST_DB_TYPE === "mongodb" ? "1" : 1,
        email: "extendedClient@foobar.com",
      })
    })
  })
})