import { simulateSeed } from '../../../testing';
import { it, expect } from "vitest"
import { describe } from "../../../testing/helpers"

describe('client (reset)', ({ prismock }) => {
  it('Should reset data', async () => {
    await prismock.reset()
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    await prismock.reset();

    const usersAfterReset = await prismock.user.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });

  it('Should reset with previous references', async () => {
    await prismock.reset()
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    const userService = prismock.user;

    await prismock.reset();

    const usersAfterReset = await userService.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });
});
