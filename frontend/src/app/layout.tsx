import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Seer Engine | AI Prediction Market Trading',
  description: 'Real-time AI-powered prediction market analysis and trading',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-sand antialiased">
        <div className="grain" />
        <div className="glow-top" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}

