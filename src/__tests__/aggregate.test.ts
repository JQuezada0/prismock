import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { createPrismock, PrismockClientType } from '../lib/client';
import { it, expect, beforeAll } from "vitest"
import { describe } from "../../testing/helpers"

describe('aggregate', ({ prisma, prismock }) => {
  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    await prisma.user.create({ data: { email: 'user4@company.com', password: 'password' } });
    await prismock.user.create({ data: { email: 'user4@company.com', password: 'password' } });
  });

  it('Should return aggregate', async () => {
    const expected = {
      _max: {
        warnings: 10,
        friends: 0,
      },
      _avg: {
        friends: 0,
        warnings: 5,
      },
      // _count: {
      //   friends: 4,
      //   warnings: 3,
      // },
      _min: {
        friends: 0,
        warnings: 0,
      },
      _sum: {
        friends: 0,
        warnings: 15,
      },
    };

    const realAggregate = await prisma.user.aggregate({
      _max: {
        warnings: true,
        friends: true,
      },
      _avg: {
        warnings: true,
        friends: true,
      },
      // _count: {
      //   warnings: true,
      //   friends: true,
      // },
      _min: {
        warnings: true,
        friends: true,
      },
      _sum: {
        warnings: true,
        friends: true,
      },
    });

    const mockAggregate = await prismock.user.aggregate({
      _max: {
        warnings: true,
        friends: true,
      },
      _avg: {
        warnings: true,
        friends: true,
      },
      // _count: {
      //   warnings: true,
      //   friends: true,
      // },
      _min: {
        warnings: true,
        friends: true,
      },
      _sum: {
        warnings: true,
        friends: true,
      },
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });

  it('Should return selected aggregate', async () => {
    const expected = {
      _max: {
        warnings: 5,
        friends: 0,
      },
    };

    const realAggregate = await prisma.user.aggregate({
      _max: {
        warnings: true,
        friends: true,
      },
      where: {
        email: 'user2@company.com',
      },
    });

    const mockAggregate = await prismock.user.aggregate({
      _max: {
        warnings: true,
        friends: true,
      },
      where: {
        email: 'user2@company.com',
      },
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });
  it('Should allow count all', async () => {
    const expected = {
      _count: { _all: 4 },
    };

    const realAggregate = await prisma.user.aggregate({
      _count: { _all: true },
    });

    const mockAggregate = await prismock.user.aggregate({
      _count: { _all: true },
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });
  it('Should allow _count: true shorthand', async () => {
    const expected = {
      _count: 4,
    };

    const realAggregate = await prisma.user.aggregate({
      _count: true,
    });

    const mockAggregate = await prismock.user.aggregate({
      _count: true,
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });
});
