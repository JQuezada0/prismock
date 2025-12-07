# prismock

[![npm](https://img.shields.io/npm/v/@pkgverse/prismock)](https://www.npmjs.com/package/@pkgverse/prismock)
[![npm](https://img.shields.io/npm/dm/@pkgverse/prismock)](https://www.npmjs.com/package/@pkgverse/prismock)

## NOTE
Originally forked from https://github.com/morintd/prismock. This library is awesome, and I felt it could use some modernization to work with newer versions of prisma and add support for
client extensions. My current intention is to try to maintain this and stay up to speed with bug-fixes, contributions are welcome! The focus is ESM-first, so although both ESM and CJS exports are provided, I haven't personally tested the CJS functionality.

---

This is a mock for `PrismaClient`. It actually reads your `schema.prisma` and generate models based on it. For postgres it also offers a true in-memory database client by using PgLite.

It perfectly simulates Prisma's API and stores everything in-memory for fast, isolated, and retry-able unit tests.

It's heavily tested, by comparing the mocked query results with real results from prisma. Tested environments include `MySQL`, `PostgreSQL` and `MongoDB`.

> This library can also be used as an in-memory implementation of Prisma, for reasons such as prototyping, but that's not its primary goal.

# Installation

After setting up [Prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project):

yarn

```sh
$ yarn add -D @pkgverse/prismock
```

npm

```
$ npm add --save-dev @pkgverse/prismock
```

bun

```
$ bun add -E -D @pkgverse/prismock
```

# Usage

```ts
import { PrismaClient } from "${your_prisma_client_directory}"
import { getClient } from '@pkgverse/prismock';

// Pass in your PrismaClient class and the path to your schema
let mockedClient = await getClient({
  prismaClient: PrismaClient,
  schemaPath: "prisma/schema.prisma",
})

// Optionally apply your client extensions to the client
mockedClient = applyExtensions(mockedClient)
```

That's it, prisma will be mocked in all your tests (tested with ViTest)

## Using PgLite (experimental)

If you're using prisma with postgres, you can optionally choose to have the mocked prisma client use PgLite for more 'true-to-life' tests.

```ts
import { PrismaClient } from "${your_prisma_client_directory}"
import { getClient } from '@pkgverse/prismock';

let mockedClient = await getClient({
  prismaClient: PrismaClient,
  schemaPath: "prisma/schema.prisma",
  usePgLite: true,
})

// Optionally apply your client extensions to the client
mockedClient = applyExtensions(mockedClient)
```

The prisma client will execute everything as it normally would purely in-memory.

⚠️ ### NOTE ⚠️
The PgLite database is initialized by executing your migration history. It's currently assumed that the migrations directory is in the same directory
as the schema file, i.e. the directory of the file path you pass in as `schemaPath`. If that's not the case, this will most likely fail.


## Mocking the PrismaClient module

You can mock the PrismaClient directly in your test, or setupTests ([Example](https://github.com/JQuezada0/prismock/blob/main/src/__tests__/client/example-prismock.test.ts)):

```ts
import { vi } from "vitest"

vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client")
  const actualPrismock = await vi.importActual<typeof import("@pkgverse/prismock")>("@pkgverse/prismock")

  return {
    ...actual,
    PrismaClient: await actualPrismock.getClientClass({
      prismaClient: actual.PrismaClient,
      schemaPath: "prisma/schema.prisma",
    }),
  };
});
```

## Use prismock manually

You can get an instantiated prisma client and pass it wherever you need to

```ts
import { PrismaClient } from '${your_prisma_client_directory}';
import { getClient } from '@pkgverse/prismock';

const client = await getClient({
  PrismaClient,
  schemaPath: "prisma/schema.prisma",
});
```

Then, you will be able to write your tests as if your app was using an in-memory Prisma client.

## Use with decimal.js

See [use with decimal.js](https://github.com/morintd/prismock/blob/master/docs/use-with-decimal-js.md).

## Internal data

Two additional functions are returned compared to the PrismaClient, `getData`, and `reset`.

```ts
const prismock = await getClient({...});
prismock.getData(); // { user: [] }
```

```ts
const prismock = await getClient({...});
prismock.reset(); // State of prismock back to its original
```

# Supported features

## Model queries

| Feature    | State                       |
| ---------- | --------------------------- |
| findUnique | ✔                           |
| findFirst  | ✔                           |
| findMany   | ✔                           |
| create     | ✔                           |
| createMany | ✔                           |
| delete     | ✔                           |
| deleteMany | ✔                           |
| update     | ✔                           |
| updateMany | ✔                           |
| upsert     | ✔                           |
| count      | ✔                           |
| aggregate  | ✔                           |
| groupBy    | 💬 [note](#groupby-support) |

## Model query options

| Feature           | State |
| ----------------- | ----- |
| distinct          | ✔     |
| include           | ✔     |
| where             | ✔     |
| select            | ✔     |
| orderBy (Partial) | ✔     |
| select + count    | ⛔    |

## Nested queries

| Feature         | State |
| --------------- | ----- |
| create          | ✔     |
| createMany      | ✔     |
| update          | ✔     |
| updateMany      | ✔     |
| connect         | ✔     |
| connectOrCreate | ✔     |
| upsert          | ✔     |
| set             | ⛔    |
| disconnect      | ⛔    |
| delete          | ⛔    |

## Filter conditions and operators

| Feature   | State |
| --------- | ----- |
| equals    | ✔     |
| gt        | ✔     |
| gte       | ✔     |
| lt        | ✔     |
| lte       | ✔     |
| not       | ✔     |
| in        | ✔     |
| notIn     | ✔     |
| contains  | ✔     |
| startWith | ✔     |
| endsWith  | ✔     |
| AND       | ✔     |
| OR        | ✔     |
| NOT       | ✔     |
| mode      | ✔     |
| search    | ⛔    |

## Relation filters

| Feature | State |
| ------- | ----- |
| some    | ✔     |
| every   | ✔     |
| none    | ✔     |
| is      | ✔    |

## Scalar list methods

| Feature | State |
| ------- | ----- |
| set     | ⛔    |
| push    | ✔    |

## Scalar list filters

| Feature  | State |
| -------- | ----- |
| has      | ⛔    |
| hasEvery | ⛔    |
| hasSome  | ⛔    |
| isEmpty  | ⛔    |
| equals   | ⛔    |

## Atomic number operations

| Feature   | State |
| --------- | ----- |
| increment | ✔     |
| decrement | ✔     |
| multiply  | ✔     |
| divide    | ✔     |
| set       | ✔     |

## JSON filters

| Feature             | State |
| ------------------- | ----- |
| path                | ⛔    |
| string_contains     | ⛔    |
| string_starts_withn | ⛔    |
| string_ends_with    | ⛔    |
| array_contains      | ⛔    |
| array_starts_with   | ⛔    |
| array_ends_with     | ⛔    |

## Attributes

| Feature    | State |
| ---------- | ----- |
| @@id       | ✔     |
| @default   | ✔     |
| @relation  | ✔     |
| @unique    | ⛔    |
| @@unique   | ✔     |
| @updatedAt | ⛔    |

## Attribute functions

| Feature         | State |
| --------------- | ----- |
| autoincrement() | ✔     |
| now()           | ✔     |
| uuid()          | ✔     |
| auto()          | ✔     |
| cuid()          | ✔     |
| dbgenerated     | ⛔    |

## Referential actions

| Feature                                     | State |
| ------------------------------------------- | ----- |
| onDelete (SetNull, Cascade)                 | ✔     |
| onDelete (Restrict, NoAction, SetDefault)() | ⛔    |
| onUpdate                                    | ⛔    |

## Notes

### groupBy Support

Basic groupBy queries are supported, including `having` and `orderBy`. `skip`, `take`, and `cursor` are not yet supported.

# Roadmap

- Complete supported features.
- Refactoring of update operation.
- Replace item formatting with function composition
- Restore test on `_count` for mongodb
- Add custom client method for MongoDB (`$runCommandRaw`, `findRaw`, `aggregateRaw`)

# Credit

Inspired by [prisma-mock](https://github.com/demonsters/prisma-mock).
