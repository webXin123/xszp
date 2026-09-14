# 屹力学校学生综评系统

一个完整的学生综合素质评价系统前端项目，支持多种角色和功能模块。

## 项目特性

### 🎯 多角色支持
- **管理员**：系统管理、数据分析、活动管理
- **班主任**：班级评价、周优雅班集体、积分管理
- **家长**：查看活动、积分统计、奖卡下载
- **学科教师**：学科评价、成绩录入
- **学生**：活动报名、查看评价

### 📋 主要功能
- **活动管理系统**：活动发布、报名审核、提交查看
- **评价系统**：班级评价、个人评价、学科评价
- **奖卡系统**：在线预览、下载奖卡
- **体质健康导入**：Excel文件批量导入
- **数据可视化**：积分统计、图表展示

### 🛠️ 技术栈
- **框架**：Next.js 16.3.3 (静态导出)
- **语言**：TypeScript 5.7.3
- **样式**：Tailwind CSS 4.3.3
- **组件**：shadcn/ui
- **包管理**：pnpm 10.0.0

## 部署说明

### GitHub Pages 部署

本项目已配置GitHub Actions自动部署到GitHub Pages。

#### 自动部署步骤：
1. 推送代码到main分支
2. GitHub Actions自动构建项目
3. 自动部署到GitHub Pages

#### 手动启用GitHub Pages：
1. 访问仓库：https://github.com/[你的用户名]/mzlg
2. 点击 "Settings" 标签
3. 在左侧菜单找到 "Pages"
4. 在 "Source" 部分，选择 "GitHub Actions"
5. 点击 "Save"

#### 部署完成后访问：
```
https://[你的用户名].github.io/xszp/
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 本地访问地址
http://localhost:3000/xszp/

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
├── app/                    # Next.js App Router
│   ├── activities/        # 活动相关页面
│   ├── offline-award-cards/  # 奖卡页面
│   └── pe-score-import/  # 体质健康导入
├── components/            # React组件
│   ├── activity/         # 活动管理组件
│   ├── admin/           # 管理员组件
│   ├── evaluation/      # 评价系统组件
│   ├── homeroom/        # 班主任组件
│   ├── parent/          # 家长组件
│   └── subject/         # 学科教师组件
├── lib/                  # 工具函数和类型定义
├── public/              # 静态资源
└── scripts/             # 构建脚本
```

## 配置说明

### Next.js 配置
- 静态导出：`output: "export"`
- 图片优化：`unoptimized: true`
- TypeScript错误忽略：`ignoreBuildErrors: true`

### GitHub Actions 配置
- 自动构建：使用pnpm安装依赖和构建
- 静态文件输出：`./out`目录
- 自动部署：配置为GitHub Pages源

## 注意事项

1. 项目已配置为静态导出模式，适合部署到静态网站托管服务
2. 所有图片资源已设置为非优化模式，避免构建问题
3. TypeScript构建错误已被忽略，确保构建顺利完成
4. 使用trailingSlash配置确保路由一致性

## 许可证

MIT License
