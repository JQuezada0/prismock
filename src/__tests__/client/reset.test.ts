import { simulateSeed } from '../../../testing';
import { createPrismock } from '../../lib/client';
import { describe, it, expect, beforeAll } from "vitest"

describe('client (reset)', () => {
  it('Should reset data', async () => {
    const prismock = await createPrismock()
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    prismock.reset();

    const usersAfterReset = await prismock.user.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });

  it('Should reset with previous references', async () => {
    const prismock = await createPrismock()
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    const userService = prismock.user;

    prismock.reset();

    const usersAfterReset = await userService.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });
});
