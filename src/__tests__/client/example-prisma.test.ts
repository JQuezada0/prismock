import { it } from "vitest"
import { describe } from "../../../testing/helpers"

import { simulateSeed } from '../../../testing';

describe('Example', ({ prisma, reset, beforeAll }) => {
  describe('Without mock', () => {
    beforeAll(async () => {
      await reset()
      await simulateSeed(prisma);
    });

    it('Should throw as user email is taken', async ({ expect }) => {
      const users = await prisma.user.findMany()
      console.log("EXISTING USERS!", users)
      await simulateSeed(prisma);
      const users2 = await prisma.user.findMany()
      console.log("EXISTING USERS AFTER SEED!", users2)
      await expect(async () => prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } })).rejects.toThrow();
    });
  });
});
