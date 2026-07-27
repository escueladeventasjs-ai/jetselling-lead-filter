import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'JetSelling® Lead Filter',
  description: 'Asistente de prediagnóstico para encontrar el siguiente paso con JetSelling®.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#212749',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NLNE55ZT20"
          strategy="afterInteractive"
        />
        <Script id="jetselling-ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', 'G-NLNE55ZT20');
          `}
        </Script>
      </body>
    </html>
  );
}
