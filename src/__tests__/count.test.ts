import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { createPrismock, PrismockClientType } from '../lib/client';
import { it, expect, beforeAll } from "vitest"
import { describe } from "../../testing/helpers"

describe('count', ({ prisma, prismock }) => {
  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);
  });

  it('Should return count', async () => {
    const realCount = await prisma.user.count({ where: { warnings: { gt: 0 } } });
    const mockCount = await prismock.user.count({ where: { warnings: { gt: 0 } } });

    expect(realCount).toBe(2);
    expect(mockCount).toBe(2);
  });
});
