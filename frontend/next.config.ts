import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "radix-ui",
      "date-fns",
      "chart.js",
      "react-chartjs-2",
    ],
  },
};

export default nextConfig;
