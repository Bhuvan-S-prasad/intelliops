import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase API body size limit for file uploads (default is 1MB)
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    // Increase response timeout for long-running operations
    responseLimit: "50mb",
  },
  // Configure serverless function timeout (Vercel)
  serverRuntimeConfig: {
    // Only available on the server side
  },
  publicRuntimeConfig: {
    // Available on both server and client
  },
};

export default nextConfig;