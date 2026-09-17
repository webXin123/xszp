
import type { Metadata, Viewport } from 'next'
import { PageLoadingOverlay } from '@/components/ui/page-loading-overlay'
import './globals.css'

export const metadata: Metadata = {
  title: '屹力学生综评',
  description: '屹力学生综合评价平台',
  generator: 'v0.app',
  icons: {
    icon: '/xszp/images/logo.png',
    shortcut: '/xszp/images/logo.png',
    apple: '/xszp/images/logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef3fa' },
    { media: '(prefers-color-scheme: dark)', color: '#202b44' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="bg-background">
      <body className="antialiased font-sans">
        {children}
        <PageLoadingOverlay />
      </body>
    </html>
  )
}
