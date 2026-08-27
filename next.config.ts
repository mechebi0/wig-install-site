import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    PRESERVED: static export for Cloudflare Pages.

    Pages project settings this must stay compatible with:
      production branch : main
      framework         : Next.js (Static HTML Export)
      build command     : npx next build
      output directory  : out
      root directory    : /

    Do not remove either setting below, and do not introduce API routes,
    server actions, middleware, or ISR: the optimizer and the Node server do
    not exist on a static host, and any of those would break the deployment.
  */
  output: "export",
  images: {
    // Required by `output: "export"`. All photography is committed under
    // public/images/ and pre-sized there, so no remote hosts are needed and
    // no third-party CDN can break the deployed site.
    unoptimized: true,
  },
};

export default nextConfig;
