import { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vertax.pro";

export const metadata: Metadata = {
  title: "VertaX · 面向中国企业出海的智能获客平台",
  description:
    "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立可持续、可进化的全球增长体系。",
  keywords:
    "出海获客,企业出海,智能获客平台,制造业出海,工业品出海,B2B获客,知识引擎,获客雷达,增长系统,GTM系统",
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      en: "/en",
    },
  },
  openGraph: {
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description:
      "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助企业建立可持续的全球增长体系。",
    url: SITE_URL,
    siteName: "VertaX",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "VertaX - 出海获客智能体",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VertaX · 面向中国企业出海的智能获客平台",
    description:
      "VertaX 是面向中国企业出海的智能获客平台，帮助企业建立可持续的全球增长体系。",
    images: [`${SITE_URL}/og-image.svg`],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VertaX",
  alternateName: "VertaX 出海获客智能体",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "VertaX 是面向中国企业出海的智能获客平台，围绕知识引擎、内容增长、商机挖掘、品牌声量、协同推进与经营决策六大能力，帮助制造业、工业品、技术服务型企业建立可持续、可进化的全球增长体系。",
  foundingDate: "2024",
  address: {
    "@type": "PostalAddress",
    addressCountry: "HK",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "contact@vertax.top",
  },
  sameAs: ["https://mp.weixin.qq.com/s/3WO5IPyNDHvMGEKd5uBuCg"],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VertaX",
  url: SITE_URL,
  description: "面向中国企业出海的智能获客平台",
  publisher: {
    "@type": "Organization",
    name: "VertaX",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <LandingPage />
    </>
  );
}
