import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Speech assets are versioned by directory name (whisper-tiny-en-v1)
        // and the pinned onnxruntime-web build, so they can be cached for a
        // year: a model change ships under a new URL rather than a new body.
        source: "/:prefix(models|wasm)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
