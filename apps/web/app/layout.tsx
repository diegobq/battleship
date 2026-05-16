import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastViewport } from "./_components/ui/ToastViewport";
import { SafeArea } from "./_components/ui/SafeArea";
import "./globals.css";
import "./_theme/christmas.css";
import "./_theme/dark.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Battleship",
  description: "Real-time online Battleship — ASSE assessment build.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const THEME_SCRIPT = `(function(){var t=sessionStorage.getItem("bs-theme");if(t&&t!=="default")document.documentElement.dataset.theme=t;})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SafeArea edge="all">{children}</SafeArea>
        <ToastViewport />
      </body>
    </html>
  );
}
