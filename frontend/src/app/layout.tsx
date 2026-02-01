import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "aurafx | 静かなリピート自動売買",
  description: "市場の静けさと共に、確実な取引を灯す。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">
        <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full" />
        </div>
        {children}
      </body>
    </html>
  );
}
