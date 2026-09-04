import type { Metadata } from "next";
import "./globals.css";
import { FinancialDataProvider } from "@/context/FinancialDataContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "FlexiFund AI — Financial Resilience for Irregular Incomes",
  description: "FlexiFund AI helps gig and informal workers understand irregular income, find potential savings, prepare for income shocks, and discover verified financial-support opportunities.",
  keywords: [
    "gig worker finance",
    "irregular income planning",
    "financial resilience",
    "delivery partner savings",
    "income volatility",
    "e-Shram",
    "PM-SYM",
    "informal worker banking",
  ],
  authors: [{ name: "FlexiFund AI Product Team" }],
  openGraph: {
    title: "FlexiFund AI — Adaptive Financial Planning for Irregular Incomes",
    description: "When your income changes, your financial plan should change with it. Adaptive resilience scoring, emergency runway forecasting, and verified government support.",
    url: "https://flexifund.ai",
    siteName: "FlexiFund AI",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlexiFund AI — Financial Resilience for Irregular Incomes",
    description: "When your income changes, your financial plan should change with it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('flexifund_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F5FAFF] dark:bg-[#0B1220] text-[#0F2747] dark:text-[#F8FAFC] font-sans antialiased transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <FinancialDataProvider>
              <AppShell>{children}</AppShell>
            </FinancialDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
