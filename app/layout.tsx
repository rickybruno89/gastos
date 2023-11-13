import "@/app/global.css"

import { Metadata } from 'next';
import { NextAuthProvider } from "./Providers";
import { inter } from "@/components/ui/fonts";

export const metadata: Metadata = {
  title: {
    template: '%s | Acme',
    default: 'Acme',
  },
  description: 'The official Next.js Learn Dashboard built with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
