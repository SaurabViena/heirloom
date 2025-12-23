import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { FheLoader } from "@/components/providers/fhe-loader";
import { FheProvider } from "@/components/providers/fhe-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heirloom - Confidential Credential Inheritance System",
  description: "Confidential credential storage and inheritance system based on FHEVM fully homomorphic encryption",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FheLoader />
        <Providers>
          <FheProvider>{children}</FheProvider>
        </Providers>
      </body>
    </html>
  );
}
