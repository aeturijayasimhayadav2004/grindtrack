import { ensureCatalog } from "./scripts/catalog.mjs";

// Generated from src/data/questions.json on every dev/build start (a no-op when
// the file for the current snapshot already exists). See scripts/catalog.mjs.
const catalogFile = ensureCatalog();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CATALOG_URL: `/data/${catalogFile}`,
  },
  async headers() {
    return [
      {
        // Content-hashed file name, so it can be cached forever: a new snapshot
        // gets a new URL rather than a stale hit.
        source: "/data/:file(catalog-[0-9a-f]+\\.json)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
