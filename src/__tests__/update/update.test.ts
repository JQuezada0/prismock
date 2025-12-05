import type { Service, User } from '@prisma/client';

import {
  buildUser,
  formatEntries,
  formatEntry,
  seededReactions,
  seededServices,
  seededUsers,
  simulateSeed,
} from '../../../testing';
import type { Item } from '../../lib/delegate';
import { fetchProvider } from '../../lib/prismock';
import { it } from "vitest"
import { describe } from "../../../testing/helpers"

describe('update', ({ prisma, prismock, beforeAll }) => {
  let provider: string;

  beforeAll(async () => {
    await simulateSeed(prisma);
    await simulateSeed(prismock);

    provider = await fetchProvider();
  });

  describe('Update', () => {
    let realUpdate: Item;
    let mockUpdate: Item;

    beforeAll(async () => {
      realUpdate = await prisma.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
      mockUpdate = await prismock.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
    });

    it('Should return updated item', ({ expect }) => {
      const expected = buildUser(1, { warnings: 99 });

      expect(formatEntry(realUpdate)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUpdate)).toEqual(formatEntry(expected));
    });

    it('Should update stored data', async ({ expect }) => {
      const expectedStore = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2]];
      const mockStored = ((await prismock.getData()).user as User[]).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
    });
  });

  describe('Update (not found)', () => {
    it("Should raise Error if doesn't exist", async ({ expect }) => {
      await expect(() => prisma.user.update({ where: { email: 'foo@bar.com' }, data: { warnings: 0 } })).rejects.toThrow();
      await expect(() => prismock.user.update({ where: { email: 'foo@bar.com' }, data: { warnings: 0 } })).rejects.toThrowError(
        expect.objectContaining({
          name: 'PrismaClientKnownRequestError',
          code: 'P2025',
          message: expect.stringMatching(/No record was found for an update/),
        }),
      );
    });
  });

  describe('Update (push)', () => {
    let realService: Service;
      let mockService: Service;

    beforeAll(async () => {
      const seededService = seededServices[0];

      realService = (await prisma.service.findFirst({ where: { name: seededService.name } }))!;
      mockService = (await prismock.service.findFirst({ where: { name: seededService.name } }))!;

      await prisma.service.updateMany({
        where: { name: seededService.name },
        data: {
          tags: {
            push: ['tag1', 'tag2'],
          },
        },
      });
      prismock.service.updateMany({
        where: { name: seededService.name },
        data: {
          tags: {
            push: ['tag1', 'tag2'],
          },
        },
      });
    });

    it.runIf(['mongodb', 'postgresql'].includes(provider))('Should update stored data', async ({ expect }) => {
      const mockStored = await prismock.service.findMany({ select: { name: true, tags: true, userId: true } });
      const stored = await prisma.service.findMany({ select: { name: true, tags: true, userId: true } });

      expect(stored).toEqual([
        {
          name: realService.name,
          tags: ['tag1', 'tag2'],
          userId: realService.userId,
        },
      ]);

      expect(mockStored).toEqual([
        {
          name: mockService.name,
          tags: ['tag1', 'tag2'],
          userId: mockService.userId,
        },
      ]);
    })
   
  });

  describe('Update using compound id with default name', () => {
    const expectedNewValue = 100;

    beforeAll(async () => {
      if (provider !== 'mongodb') {
        const updatedReaction = seededReactions[0];
        const untouchedReaction = seededReactions[1];

        await prisma.reaction.update({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
          data: {
            value: expectedNewValue,
          },
        });
        await prismock.reaction.update({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
          data: {
            value: expectedNewValue,
          },
        });
      }
    });

    it('Should update expected entry', async ({ expect }) => {
      if (provider !== 'mongodb') {
        const updatedReaction = seededReactions[0];
        const untouchedReaction = seededReactions[1];

        const realResult = await prisma.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
        });
        const mockResult = await prismock.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
        });

        expect(realResult?.value).toEqual(expectedNewValue);
        expect(mockResult?.value).toEqual(expectedNewValue);
      } else {
        console.log('[SKIPPED] compound ID not supported on MongoDB');
      }
    });

    it('Should not update other data', async ({ expect }) => {
      if (provider !== 'mongodb') {
        const updatedReaction = seededReactions[0];
        const untouchedReaction = seededReactions[1];

        const realResult = await prisma.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: untouchedReaction.userId,
              emoji: untouchedReaction.emoji,
            },
          },
        });
        const mockResult = await prismock.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: untouchedReaction.userId,
              emoji: untouchedReaction.emoji,
            },
          },
        });

        expect(realResult?.value).toEqual(untouchedReaction.value);
        expect(mockResult?.value).toEqual(untouchedReaction.value);
      } else {
        console.log('[SKIPPED] compound ID not supported on MongoDB');
      }
    });
  });
});
