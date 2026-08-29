import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'School-ERP | Enterprise Management Platform',
  description: 'Production-grade commercial School ERP system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
