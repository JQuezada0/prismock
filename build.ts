// build.ts
async function buildEsm(prismaMajorVersion: "6" | "7") {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: `dist/v${prismaMajorVersion}`,
    format: 'esm',
    target: 'node',
    naming: "[name].mjs",
    external: ["@electric-sql/pglite", "pglite-prisma-adapter"],
    define: {
      "PRISMA_MAJOR_VERSION": `"${prismaMajorVersion}"`,
    },
    plugins: [{
      name: 'selective-external',
      setup(build) {
        build.onResolve({ filter: /^@prisma\// }, (args) => {
          // Inline .json imports, externalize everything else
          if (args.path.endsWith('.json')) {
            return null; // default handling = bundle it
          }

          if (args.path.includes("@prisma/client-runtime-utils") || args.path.includes("@prisma/dmmf")) {
            return null
          }
  
          return { path: args.path, external: true };
        });
      }
    }]
  })
}

async function buildCjs(prismaMajorVersion: "6" | "7") {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: `dist/v${prismaMajorVersion}`,
    format: 'cjs',
    target: 'node',
    naming: "[name].cjs",
    external: ["@electric-sql/pglite", "pglite-prisma-adapter"],
    define: {
      "PRISMA_MAJOR_VERSION": `"${prismaMajorVersion}"`,
    },
    plugins: [{
      name: 'selective-external',
      setup(build) {
        build.onResolve({ filter: /^@prisma\// }, (args) => {
          // Inline .json imports, externalize everything else
          if (args.path.endsWith('.json')) {
            return null; // default handling = bundle it
          }
  
          return { path: args.path, external: true };
        });
      }
    }]
  })
}

await Promise.all([
  buildEsm("6"),
  buildEsm("7"),
  buildCjs("6"),
  buildCjs("7"),
])

export {}
