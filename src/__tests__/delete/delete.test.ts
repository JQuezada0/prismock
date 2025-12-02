import { PrismaClient, Role, User } from '@prisma/client';
import { version as clientVersion } from '@prisma/client/package.json';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { formatEntries, formatEntry, generateId, resetDb, simulateSeed } from '../../../testing';
import { createPrismock, PrismockClientType } from '../../lib/client';
import { describe, it, expect, beforeAll } from 'vitest';


describe('delete', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const data = {
    user1: { email: 'user-delete-1@company.com', password: 'password', warnings: 0 },
    user2: { email: 'user-delete-2@company.com', password: 'password', warnings: 99 },
    user3: { email: 'user-delete-3@company.com', password: 'password', warnings: 99 },
  };

  const expected = [
    {
      banned: false,
      email: 'user-delete-1@company.com',
      friends: 0,
      id: generateId(4),
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 0,
      birthday: null,
    },
    {
      banned: false,
      email: 'user-delete-2@company.com',
      friends: 0,
      id: generateId(5),
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 99,
      birthday: null,
    },
    {
      banned: false,
      email: 'user-delete-3@company.com',
      friends: 0,
      id: generateId(6),
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 99,
      birthday: null,
    },
  ];

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await createPrismock()
    await simulateSeed(prismock);

    const user1 = await prisma.user.create({ data: data.user1 });
    const user2 = await prisma.user.create({ data: data.user2 });
    const user3 = await prisma.user.create({ data: data.user3 });

    await prismock.user.createMany({ data: [user1, user2, user3].map(({ id, ...user }) => ({ ...user, parameters: {} })) });
    expect(formatEntries((await prismock.getData()).user.slice(-3))).toEqual(formatEntries(expected));
  });

  describe('delete', () => {
    let realDelete: User;
    let mockDelete: User;

    beforeAll(async () => {
      realDelete = await prisma.user.delete({ where: { email: 'user-delete-1@company.com' } });
      mockDelete = await prismock.user.delete({ where: { email: 'user-delete-1@company.com' } });
    });

    it('Should delete a single element', () => {
      expect(formatEntry(realDelete)).toEqual(formatEntry(expected[0]));
      expect(formatEntry(mockDelete)).toEqual(formatEntry(expected[0]));
    });

    it('Should delete user from stored data', async () => {
      const stored = await prisma.user.findMany();
      const mockStored = (await prismock.getData()).user;

      expect(stored.find((user) => user.email === 'user-delete-1@company.com')).toBeUndefined();
      expect(mockStored.find((user) => user.email === 'user-delete-1@company.com')).toBeUndefined();
    });

    it('Should throw if no element is found', async () => {
      await expect(() => prisma.user.delete({ where: { email: 'does-not-exist' } })).rejects.toThrow();

      // TODO: Fix this expect to work with both pglite and prismock in-memory store
      await expect(() => prismock.user.delete({ where: { email: 'does-not-exist' } })).rejects.toThrowError(expect.objectContaining({
        name: 'PrismaClientKnownRequestError',
        code: 'P2025',
        message: expect.stringMatching(/No record was found for a delete/)
      }))
    });
  });
});
