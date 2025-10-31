import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fairy Tale Platform - Share and Discover Magical Stories",
    template: "%s | Fairy Tale Platform"
  },
  description: "Discover and share enchanting fairy tales from around the world. Read magical stories, connect with storytellers, and explore the world of fairy tales.",
  keywords: ["fairy tales", "stories", "magical stories", "children stories", "fantasy", "folklore"],
  authors: [{ name: "Fairy Tale Platform" }],
  creator: "Fairy Tale Platform",
  publisher: "Fairy Tale Platform",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://fairytail-platform.web.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fairytail-platform.web.app',
    title: 'Fairy Tale Platform - Share and Discover Magical Stories',
    description: 'Discover and share enchanting fairy tales from around the world. Read magical stories, connect with storytellers, and explore the world of fairy tales.',
    siteName: 'Fairy Tale Platform',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Fairy Tale Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fairy Tale Platform - Share and Discover Magical Stories',
    description: 'Discover and share enchanting fairy tales from around the world.',
    images: ['/og-image.jpg'],
    creator: '@fairytailplatform',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p>&copy; {new Date().getFullYear()} FairyTale Platform. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
