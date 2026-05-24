/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/routines", destination: "/plan", permanent: false }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wger.de",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "static.exercisedb.dev",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/**",
      },
      {
        protocol: "https",
        hostname: "cdn.exerciseapi.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.smartworkout.app",
        pathname: "/asset/**",
      },
    ],
  },
};

export default nextConfig;

