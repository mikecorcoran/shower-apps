import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['7z-wasm']
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, module: false }; // client-only tool
    return config;
  }
};

export default nextConfig;
