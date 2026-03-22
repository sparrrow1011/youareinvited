import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouAreInvited Admin',
  description: 'Platform super-admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-primary text-white antialiased">{children}</body>
    </html>
  );
}
