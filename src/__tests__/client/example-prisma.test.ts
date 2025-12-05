import { it, expect, beforeAll } from "vitest"
import { describe } from "../../../testing/helpers"

import { resetDb, simulateSeed } from '../../../testing';

describe('Example', ({ prisma }) => {
  describe('Without mock', () => {
    beforeAll(async () => {
      await resetDb();
      await simulateSeed(prisma);
    });

    it('Should throw as user email is taken', async () => {
      await expect(async () => prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } })).rejects.toThrow();
    });
  });
});
