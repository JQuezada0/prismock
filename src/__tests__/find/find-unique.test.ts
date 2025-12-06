import type { User } from '@prisma/client';
import { it, expect, beforeAll } from 'vitest'
import { seededUsers, simulateSeed, seededBlogs, seededServices, seededReactions } from '../../../testing';
import { fetchProvider } from '../../lib/prismock';
import { describe } from "../../../testing/helpers"

describe('find', ({ prisma, prismock }) => {
  let realUser: User;
  let mockUser: User;

  let provider: string;

  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    provider = await fetchProvider();

    realUser = (await prisma.user.findUnique({ where: { email: seededUsers[0].email } }))!;
    mockUser = (await prismock.user.findUnique({ where: { email: seededUsers[0].email } }))!;
  });

  describe('findUnique', () => {
    it('Should return corresponding item', async () => {
      const expected = seededBlogs[1].title;
      const realBlog = (await prisma.blog.findUnique({
        where: { blogByUserAndCategory: { userId: realUser.id, category: 'normal' } },
      }))!;
      const mockBlog = (await prismock.blog.findUnique({
        where: { blogByUserAndCategory: { userId: mockUser.id, category: 'normal' } },
      }))!;

      expect(realBlog.title).toEqual(expected);
      expect(mockBlog.title).toEqual(expected);
    });

    it('Should return corresponding item based on @@id', async () => {
      if (provider !== 'mongodb') {
        const expected = seededServices[0];
        const realService = (await prisma.service.findUnique({
          where: { compositeId: { name: expected.name, userId: expected.userId } },
        }))!;
        const mockService = (await prismock.service.findUnique({
          where: { compositeId: { name: expected.name, userId: expected.userId } },
        }))!;

        expect(realService).toEqual(expected);
        expect(mockService).toEqual(expected);
      }
    });

    it('Should return corresponding item based on @@id with default name', async () => {
      if (provider !== 'mongodb') {
        const expected = seededReactions[0];
        const realService = await prisma.reaction.findUnique({
          where: { userId_emoji: { userId: expected.userId, emoji: expected.emoji } },
        });
        const mockService = await prismock.reaction.findUnique({
          where: { userId_emoji: { userId: expected.userId, emoji: expected.emoji } },
        });

        expect(realService).toEqual(expected);
        expect(mockService).toEqual(expected);
      }
    });
  });
});
