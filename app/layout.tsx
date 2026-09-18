import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '流程看板 — JobBoard',
  description: 'AI 驱动的多阶段流程管理看板',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
