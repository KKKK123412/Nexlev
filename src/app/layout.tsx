import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXLEV — YouTube Opportunity Intelligence',
  description: 'Find YouTube channels about to blow up before everyone else does.',
  themeColor: '#040608',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
