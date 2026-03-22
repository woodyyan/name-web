import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "诗名 — 以诗为名，不负韶华",
  description:
    "从《诗经》《楚辞》《唐诗》《宋词》等经典古籍中，为你精选有意境、有出处的好名字。",
  keywords: ["取名", "起名", "诗经取名", "古诗词取名", "宝宝取名", "诗名"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        {/* Google Fonts: Noto Serif SC + Noto Sans SC */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700&family=Ma+Shan+Zheng&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col paper-texture">
        {children}
      </body>
    </html>
  );
}
