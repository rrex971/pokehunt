import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const pkmndpb = localFont({
  src: '../../public/fonts/pkmndpb.ttf',
  variable: '--font-pkmndpb',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Pokéhunt — A Trainer's Journey",
  description: "Pokéhunt: capture badges and hunt Pokémon",
  icons: {
    icon: '/icons/pokeball.svg',
    shortcut: '/icons/pokeball.svg',
    apple: '/icons/pokeball.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} ${pkmndpb.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
