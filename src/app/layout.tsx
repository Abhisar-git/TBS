import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Bride Side — Event Transport Concierge',
  description: 'Luxury vehicle coordination for your most cherished celebrations. Seamless guest transport, live tracking, and intelligent dispatch.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
