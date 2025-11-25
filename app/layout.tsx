import type { Metadata } from "next";
import { Cinzel, Quicksand } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "../components/Header";
import CookieConsent from "../components/CookieConsent";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Pohádková Platforma - Sdílejte a Objevujte Kouzelné Příběhy",
    template: "%s | Pohádková Platforma"
  },
  description: "Objevte a sdílejte kouzelné pohádky z celého světa. Čtěte magické příběhy, spojte se s vypravěči a prozkoumejte svět pohádek.",
  keywords: ["pohádky", "příběhy", "kouzelné příběhy", "dětské příběhy", "fantasy", "folklór"],
  authors: [{ name: "Pohádková Platforma" }],
  creator: "Pohádková Platforma",
  publisher: "Pohádková Platforma",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
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
    locale: 'cs_CZ',
    url: 'https://fairytail-platform.web.app',
    title: 'Pohádková Platforma - Sdílejte a Objevujte Kouzelné Příběhy',
    description: 'Objevte a sdílejte kouzelné pohádky z celého světa. Čtěte magické příběhy, spojte se s vypravěči a prozkoumejte svět pohádek.',
    siteName: 'Pohádková Platforma',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Pohádková Platforma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pohádková Platforma - Sdílejte a Objevujte Kouzelné Příběhy',
    description: 'Objevte a sdílejte kouzelné pohádky z celého světa.',
    images: ['/og-image.jpg'],
    creator: '@pohadkovaplatform',
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
      <head>
      </head>
      <body
        className={`${cinzel.variable} ${quicksand.variable} antialiased min-h-screen flex flex-col`}
        lang="cs"
      >
        
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <CookieConsent />
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2">
              <p>&copy; {new Date().getFullYear()} Pohádková Platforma. Všechna práva vyhrazena.</p>
              <p>
                <a href="/gdpr" className="text-gray-400 hover:text-white transition-colors">
                  Ochrana osobních údajů (GDPR)
                </a>
              </p>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
