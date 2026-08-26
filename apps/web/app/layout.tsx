import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Prahari | Tourist Safety Command",
  description: "AI-Powered Tourist Safety, Digital Identity & Offline Emergency SOS Mesh",
  manifest: "/manifest.json",
  themeColor: "#090d16",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
