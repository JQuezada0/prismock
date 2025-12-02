import * as fs from 'fs/promises';
import { resolve } from 'path';

import type { TestProject } from 'vitest/node'

export default async function setup(project: TestProject) {
  console.log("Running global setup");
  await copyPrismaClient(project.config.root);

  if (process.env.PRISMOCK_USE_PG_LITE) {
    console.info('Using PgLite');
  }
}

export async function copyPrismaClient(rootDir: string) {
  console.log(`Copying PrismaClient from ${rootDir} to .prisma-custom/client`);
  const clientSrc = resolve(rootDir, 'node_modules', '.prisma', 'client');
  const clientDest = resolve(rootDir, 'node_modules', '.prisma-custom', 'client');
  await fs.cp(clientSrc, clientDest, { force: true, recursive: true });
  console.log('Copied PrismaClient to .prisma-custom/client');
}
