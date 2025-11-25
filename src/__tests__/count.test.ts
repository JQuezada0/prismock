import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { createPrismock, PrismockClientType } from '../lib/client';
import { describe, it, expect, beforeAll } from "vitest"

describe('count', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await createPrismock()
    await simulateSeed(prismock);
  });

  it('Should return count', async () => {
    const realCount = await prisma.user.count({ where: { warnings: { gt: 0 } } });
    const mockCount = await prismock.user.count({ where: { warnings: { gt: 0 } } });

    expect(realCount).toBe(2);
    expect(mockCount).toBe(2);
  });
});
