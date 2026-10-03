// Bundles the server, including @backroom/shared and all dependencies, into a
// single dist/index.js, so the Docker image needs no node_modules.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // Some dependencies are CommonJS and call require(); ESM output needs a shim.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
