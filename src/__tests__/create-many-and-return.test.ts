import { simulateSeed } from '../../testing';
import type { User } from '@prisma/client';
import { fetchProvider } from '../lib/prismock';
import { it, expect, beforeAll } from "vitest"
import { describe } from "../../testing/helpers"

describe('createManyAndReturn', ({ prisma, prismock }) => {
  let provider: string;

  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    provider = await fetchProvider()
  });

  describe('On success', () => {
    let realUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];
    let mockUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];

    beforeAll(async () => {
      if (provider === 'postgresql') {
        realUsers = await prisma.user.createManyAndReturn({
          data: [
            { email: 'user-1@company.com', password: 'password', warnings: 0 },
            { email: 'user-2@company.com', password: 'password', warnings: 0 },
          ],
          select: {
            email: true,
            password: true,
            warnings: true,
            banned: true,
          },
        });

        mockUsers = await prismock.user.createManyAndReturn({
          data: [
            { email: 'user-1@company.com', password: 'password', warnings: 0 },
            { email: 'user-2@company.com', password: 'password', warnings: 0 },
          ],
          select: {
            email: true,
            password: true,
            warnings: true,
            banned: true,
          },
        });
      }
    });

    it('Should return created', () => {
      if (provider === 'postgresql') {
        expect(realUsers).toEqual(mockUsers);
      }
    });

    it('Should create', async () => {
      if (provider === 'postgresql') {
        const createdRealUsers = await prisma.user.findMany({
          select: {
            email: true,
            password: true,
            warnings: true,
            banned: true,
          },
        });

        const createdMockUsers = await prisma.user.findMany({
          select: {
            email: true,
            password: true,
            warnings: true,
            banned: true,
          },
        });

        expect(createdRealUsers).toEqual(createdMockUsers);
      }
    });
  });
});
