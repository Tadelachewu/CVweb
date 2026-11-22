import type { Metadata, Viewport } from "next";
import {
  EB_Garamond,
  IBM_Plex_Sans,
  Inter,
  Lato,
  Libre_Baskerville,
  Lora,
  Merriweather,
  Montserrat,
  Noto_Sans_Ethiopic,
  Nunito,
  Open_Sans,
  PT_Serif,
  Playfair_Display,
  Poppins,
  Raleway,
  Roboto,
  Roboto_Slab,
  Source_Serif_4,
  Work_Sans,
} from "next/font/google";
import fs from "node:fs";
import path from "node:path";
import "./globals.css";
import "./templates.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-serif-cv", display: "swap" });
// Amharic / Tigrinya / Afaan Oromo (Geʼez script) support, so Ethiopic text renders the same on every device and in PDFs.
const ethiopic = Noto_Sans_Ethiopic({ subsets: ["ethiopic"], variable: "--font-ethiopic", display: "swap" });
const slab = Roboto_Slab({ subsets: ["latin", "latin-ext"], variable: "--font-slab", display: "swap" });
// Optional CV fonts (only downloaded by the browser when a CV actually uses them).
const openSans = Open_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-opensans", display: "swap" });
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "700", "900"], style: ["normal", "italic"], variable: "--font-lato", display: "swap" });
const merriweather = Merriweather({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "700", "900"], style: ["normal", "italic"], variable: "--font-merriweather", display: "swap" });
const roboto = Roboto({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "700", "900"], style: ["normal", "italic"], variable: "--font-roboto", display: "swap" });
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-poppins", display: "swap" });
const raleway = Raleway({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-raleway", display: "swap" });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-nunito", display: "swap" });
const workSans = Work_Sans({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-worksans", display: "swap" });
const ibmPlex = IBM_Plex_Sans({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-ibmplex", display: "swap" });
const lora = Lora({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-lora", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const garamond = EB_Garamond({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-garamond", display: "swap" });
const baskerville = Libre_Baskerville({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-baskerville", display: "swap" });
const ptSerif = PT_Serif({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-ptserif", display: "swap" });
const display = Montserrat({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });

const hasLogo = fs.existsSync(path.join(process.cwd(), "public", "brand", "logo.jpg"));

export const metadata: Metadata = {
  title: "CV for Ethiopians",
  description: "Write your CV, pick a template and export a PDF. Everything stays in your browser.",
  ...(hasLogo ? { icons: { icon: "/brand/logo.jpg", apple: "/brand/logo.jpg" } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${display.variable} ${ethiopic.variable} ${slab.variable} ${openSans.variable} ${lato.variable} ${merriweather.variable} ${roboto.variable} ${poppins.variable} ${raleway.variable} ${nunito.variable} ${workSans.variable} ${ibmPlex.variable} ${lora.variable} ${playfair.variable} ${garamond.variable} ${baskerville.variable} ${ptSerif.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main"
          className="screen-only sr-only z-50 rounded bg-blue-700 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
