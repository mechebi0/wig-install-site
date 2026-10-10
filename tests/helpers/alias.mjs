// Lets `node --test` load the site's TypeScript modules, which import each
// other as "@/lib/...", the alias tsconfig.json declares for Next.
//
// Import this first, then load the modules under test with a dynamic
// `await import()`: static imports are all resolved before any module runs,
// so the hook has to be in place before the module graph is loaded.
// Needs Node 22.15 or later (module.registerHooks); the tests' TypeScript
// imports already need a Node that strips types by default.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      for (const ending of [".ts", ".tsx", "/index.ts"]) {
        const url = new URL(`${specifier.slice(2)}${ending}`, root);
        if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
