/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@res/core'],
  // cardápio pela IA (D-107): fotos já reduzidas no navegador; a Vercel aceita até 4,5 MB por pedido
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
  webpack(config) {
    // @res/core usa imports com extensão .js (padrão NodeNext) apontando para arquivos .ts.
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};
export default nextConfig;
