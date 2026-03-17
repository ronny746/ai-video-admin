import './globals.css'

export const metadata = {
  title: 'AI Story Hindi Admin',
  description: 'Generate high-quality Hindi stories with local AI voice models',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
