/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wger.de",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;

