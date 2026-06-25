import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'HelpHub',
  description: 'Support ticketing system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
