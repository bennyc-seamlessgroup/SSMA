import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Currenc Intelligence',
  description: 'Enterprise stock monitoring and report delivery for issuer teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
