import './globals.css'
import type { Metadata } from 'next'
import ToastNotifications from '@/components/ToastNotifications'

export const metadata: Metadata = {
  title: 'КІНО.UA - Український Кіно-Портал',
  description: 'Дивіться найкраще українське кіно онлайн. Фільми з українською озвучкою, класика та новинки українського кінематографу.',
  keywords: 'українське кіно, фільми українською, кіно онлайн, українські фільми, КІНО.UA',
  authors: [{ name: 'КІНО.UA Team' }],
  creator: 'КІНО.UA',
  publisher: 'КІНО.UA',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://kino-ua.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'КІНО.UA - Український Кіно-Портал',
    description: 'Дивіться найкраще українське кіно онлайн з українською озвучкою',
    url: 'https://kino-ua.vercel.app',
    siteName: 'КІНО.UA',
    locale: 'uk_UA',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'КІНО.UA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'КІНО.UA - Український Кіно-Портал',
    description: 'Дивіться найкраще українське кіно онлайн',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <ToastNotifications />
        
        {/* Analytics placeholder */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                    `,
                  }}
                />
              </>
            )}
          </>
        )}
      </body>
    </html>
  )
}
