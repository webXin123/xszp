/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // 确保CSS在静态导出时正确包含
  experimental: {
    optimizeCss: true,
  },
  // 确保静态资源正确处理
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
}

export default nextConfig