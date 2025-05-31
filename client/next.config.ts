import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**', // Allow any path from this host
      },
      {
        protocol: 'https',
        hostname: 'anewtestingbucketisbetter.s3.ap-southeast-1.amazonaws.com',
        port: '',
        pathname: '/**', // Allow any path from this S3 bucket
      },
    ],
  },
};

export default nextConfig;
