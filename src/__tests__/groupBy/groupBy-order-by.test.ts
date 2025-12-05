import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed, buildUser } from '../../../testing';
import { createPrismock, PrismockClientType } from '../../lib/client';
import { it, expect, beforeAll } from "vitest"
import { describe } from "../../../testing/helpers"

describe('groupBy', ({ prisma, prismock }) => {
  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    const users = [
      buildUser(4, { role: 'ADMIN' }),
      buildUser(5, { role: 'ADMIN', friends: 5 }),
      buildUser(6, { role: 'USER', friends: 1 }),
    ];
    await prisma.user.createMany({ data: users });
    await prismock.user.createMany({ data: users });
  });

  it('Should return ordered items based on numbers', async () => {
    const expected = [
      {
        friends: 5,
        _count: 1,
      },
      {
        friends: 1,
        _count: 1,
      },
      {
        friends: 0,
        _count: 4,
      },
    ];
    const mockGroups = await prismock.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'desc' }],
    });
    const realGroups = await prisma.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'desc' }],
    });

    expect(realGroups).toEqual(expected);
    expect(mockGroups).toEqual(expected);
  });

  it('Should return ordered items based on aggregates', async () => {
    const expected = [
      {
        friends: 0,
        _count: 4,
      },
      {
        friends: 1,
        _count: 1,
      },
      {
        friends: 5,
        _count: 1,
      },
    ];

    const mockGroups = await prismock.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ _count: { id: 'desc' } }, { friends: 'asc' }],
    });
    const realGroups = await prisma.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ _count: { id: 'desc' } }, { friends: 'asc' }],
    });

    expect(realGroups).toEqual(expected);
    expect(mockGroups).toEqual(expected);
  });
});
