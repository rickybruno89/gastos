import { build } from "esbuild";
await build({
  entryPoints: ["server/index.ts"],
  outfile: "build/server/index.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  packages: "external",
  sourcemap: true,
});
