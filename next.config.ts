import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@react-pdf/renderer"],
};

export default nextConfig;
