/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@res/core'],
  webpack(config) {
    // @res/core usa imports com extensão .js (padrão NodeNext) apontando para arquivos .ts.
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};
export default nextConfig;
