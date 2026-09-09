
import type { Metadata, Viewport } from 'next'
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
    { media: '(prefers-color-scheme: light)', color: '#f3f1ff' },
    { media: '(prefers-color-scheme: dark)', color: '#222752' },
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
        
      </body>
    </html>
  )
}
