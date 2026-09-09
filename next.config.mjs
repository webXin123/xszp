/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "export",
  trailingSlash: true,
  // 项目统一运行在子路径 /xszp/：http://localhost:3000/xszp/
  basePath: "/xszp",
  images: {
    unoptimized: true,
  },
  // 确保CSS在静态导出时正确包含
  experimental: {
    optimizeCss: true,
  },

  // 添加静态导出优化配置
  generateBuildId: async () => {
    return 'static-export-' + Date.now()
  },
  // 禁用增量缓存
  generateEtags: false,
  // 确保所有资源都是静态的
  compress: true,
  // 添加静态导出配置
  distDir: 'out',
}

export default nextConfig
