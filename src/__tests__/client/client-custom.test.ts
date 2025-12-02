import { DMMF } from '@prisma/generator-helper';

import { seededUsers } from '../../../testing';
import { fetchGenerator, generatePrismockSync, getProvider } from '../../lib/prismock';
import { createPrismock, PrismockClientType } from '../../lib/client';
import { generateDMMF } from '../../lib/dmmf';
import { describe, it, expect, beforeAll } from "vitest"

describe('client (custom)', () => {
  let provider: string | undefined;

  beforeAll(async () => {
    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('generatePrismock', () => {
    it('Should get data', async () => {
      const prismock = await createPrismock()
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = await prismock.getData();

      const expected = {
        user: seededUsers.map(({ id, ...user }) => user),
        blog: [],
        post: [],
        profile: [],
        service: [],
        subscription: [],
      };

      if (provider !== 'mongodb') {
        Object.assign(expected, {
          reaction: [],
        });
      }

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual(expected);
    });
  });

  describe('generatePrismockSync', () => {
    let models: DMMF.Model[];

    beforeAll(async () => {
      const schema = await generateDMMF();
      models = schema.datamodel.models as DMMF.Model[];
    });

    it('Should get data', async () => {
      const prismock = generatePrismockSync({ models });
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = await prismock.getData();

      const expected = {
        user: seededUsers.map(({ id, ...user }) => user),
        blog: [],
        post: [],
        profile: [],
        service: [],
        subscription: [],
      };

      if (provider !== 'mongodb') {
        Object.assign(expected, {
          reaction: [],
        });
      }

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual(expected);
    });
  });
});
