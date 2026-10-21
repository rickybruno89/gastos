import { build } from "esbuild";
for (const entry of ["index", "jobs/index"])
  await build({
    entryPoints: [`server/${entry}.ts`],
    outfile: `build/server/${entry}.js`,
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    packages: "external",
    sourcemap: true,
  });
