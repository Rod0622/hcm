import type { Metadata } from "next";
import { Geist, Geist_Mono, Young_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const youngSerif = Young_Serif({ variable: "--font-young-serif", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tenkara — The workforce operating system",
  description:
    "Payroll, compliance, HR, and IT automation on one employee graph. Configurable down to every field, policy, and approval — in every country you operate.",
};

const themeInit = `(function(){try{var t=localStorage.getItem("tnk-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${youngSerif.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
