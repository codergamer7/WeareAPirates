import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeBootScript } from "@/lib/theme-context";
import { SubtitleProvider } from "@/lib/subtitle-context";
import { AuthProvider } from "@/lib/auth-context";
import { PlayerPreferenceProvider } from "@/lib/player-context";
import { WatchlistProvider } from "@/lib/watchlist-context";
import { AppFrame } from "@/components/AppFrame";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <SubtitleProvider>
            <AuthProvider>
              <PlayerPreferenceProvider>
                <WatchlistProvider>
                  <AppFrame>{children}</AppFrame>
                </WatchlistProvider>
              </PlayerPreferenceProvider>
            </AuthProvider>
          </SubtitleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
