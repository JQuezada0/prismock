// build.ts
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  naming: "[name].mjs",
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
});

export {}