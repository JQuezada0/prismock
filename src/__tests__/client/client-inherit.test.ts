import { PrismaClient } from '@prisma/client';
import { simulateSeed } from '../../../testing';
import { createPrismockClass } from '../../lib/client';
import { it } from "vitest"
import { describe } from "../../../testing/helpers"

const CustomPrismockClient = await createPrismockClass();

// @ts-expect-error - ignore
class PrismockService extends CustomPrismockClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

// @ts-expect-error - ignore
class CustomPrismockService extends CustomPrismockClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

class PrismaService extends PrismaClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

describe('client', ({ databaseUrl, beforeAll }) => {
  let prismock: PrismockService;
  let customPrismock: CustomPrismockService;
  let prisma: PrismaService;

  async function reset() {
    prisma = new PrismaService({ datasourceUrl: databaseUrl });
    prismock = new PrismockService();
    customPrismock = new CustomPrismockService();
    await prismock.reset()
    await customPrismock.reset()
    await simulateSeed(prisma);
    await simulateSeed(prismock);
    await simulateSeed(customPrismock);
  }

  beforeAll(async () => {
    await reset();
  });

  it('Should return first article from custom method', async ({ expect }) => {
    const expected = [{ title: 'title1' }];

    const realPosts = await prisma.findLastPost();
    const mockPosts = await prismock.findLastPost();
    const customMockPosts = await customPrismock.findLastPost();

    expect(realPosts).toEqual(expected);
    expect(mockPosts).toEqual(expected);
    expect(customMockPosts).toEqual(expected);
  });
});
