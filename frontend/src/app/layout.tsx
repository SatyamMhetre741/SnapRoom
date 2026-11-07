import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SendMyPics — Event Photo Sharing Powered by Instant Face Matching',
  description:
    'Effortlessly collect and distribute event photos. Guests take a quick selfie to automatically find and download all their pictures in full resolution.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0d0f12] text-slate-100 selection:bg-amber-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
