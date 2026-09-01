/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "export",
  trailingSlash: true,
  // GitHub Pages 部署在仓库子路径下：https://webxin123.github.io/mzlg/
  basePath: "/mzlg",
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
  // 确保所有页面都被静态生成
  generateStaticParams: false,
  // 禁用增量缓存
  generateEtags: false,
  // 确保所有资源都是静态的
  compress: true,
  // 添加静态导出配置
  distDir: 'out',
}

export default nextConfig