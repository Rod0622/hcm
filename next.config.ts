import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resume parsers stay external so their file-based internals
  // aren't mangled by the server bundler.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
