/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer roda apenas no servidor (route handler do PDF)
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
