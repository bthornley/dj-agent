import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "GigFinder — AI Lead Finder for Musicians",
  description: "Find your next gig automatically. AI-powered venue discovery, lead scoring, and booking pipeline for DJs, bands, solo artists, and music teachers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: '#a855f7',
          colorBackground: '#14141f',
          colorInputBackground: '#1e1e2e',
          colorInputText: '#e0e0e8',
          colorText: '#e0e0e8',
          colorTextSecondary: '#9999bb',
          colorNeutral: '#e0e0e8',
        },
        elements: {
          formFieldInput: {
            backgroundColor: '#1e1e2e',
            color: '#e0e0e8',
            borderColor: '#333355',
          },
          formFieldInputShowPasswordButton: {
            color: '#9999bb',
          },
          card: {
            backgroundColor: '#14141f',
            borderColor: '#333355',
          },
        },
      }}
    >
      <html lang="en">
        <body>
          <div className="app-shell">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
