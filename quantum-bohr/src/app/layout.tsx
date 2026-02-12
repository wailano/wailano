import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Word Master | 한글-영어 학습',
  description: 'AI 이미지와 함께하는 즐거운 단어 공부',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
