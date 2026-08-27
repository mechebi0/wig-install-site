import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /*
        This site navigates with plain <a> on purpose, so the rule that pushes
        every internal href through next/link is off. The reasoning, in full,
        because "we turned off a lint rule" is otherwise indistinguishable from
        carelessness:

        Under `output: "export"`, Next 16.3.3 writes each route RSC payload to
        `out/work/__next.work/__PAGE__.txt` (a directory) but requests it at
        `/work/__next.work.__PAGE__.txt` (a flat, dot-separated filename). The
        two never match, so with next/link in place every page load fired a
        prefetch that 404d, and every "client side" navigation fetched, failed,
        and fell back to a full page load regardless. The result was the exact
        full navigation anchors give, plus a console full of 404s on all six
        pages.

        The alternative was a post-build step copying those files to the names
        the client asks for, which would mean the Cloudflare Pages build
        command could no longer be plain `npx next build`, and would silently
        rot the next time the export layout changes.

        Six static pages do not need client side routing. If a future Next
        release fixes the payload paths, delete this block and switch the nav,
        the footer and ButtonLink back to next/link.
      */
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
