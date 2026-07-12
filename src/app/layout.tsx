import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vertax.pro";

export const metadata: Metadata = {
  title: {
    default: "VertaX · 面向中国企业出海的智能获客平台",
    template: "%s | VertaX",
  },
  description:
    "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立可持续、可进化的全球增长体系。",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description:
      "围绕知识引擎、内容增长、商机挖掘与协同推进能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。",
    url: SITE_URL,
    siteName: "VertaX",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description:
      "围绕知识引擎、内容增长、商机挖掘与协同推进能力，帮助制造业、工业品、技术服务型企业建立全球增长体系。",
  },
  keywords: [
    "出海获客",
    "企业出海",
    "智能获客平台",
    "制造业出海",
    "工业品出海",
    "B2B 获客",
    "知识引擎",
    "获客雷达",
    "增长系统",
    "GTM 系统",
  ].join(", "),
  authors: [{ name: "VertaX Team", url: SITE_URL }],
  creator: "VertaX",
  publisher: "VertaX",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
