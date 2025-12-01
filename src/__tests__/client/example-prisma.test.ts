import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll } from "vitest"

import { resetDb } from '../../../testing';

describe('Example', () => {
  describe('Without mock', () => {
    beforeAll(async () => {
      await resetDb();
    });

    it('Should throw as user email is taken', async () => {
      const prisma = new PrismaClient();
      return expect(prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } })).rejects.toThrow();
    });
  });
});
