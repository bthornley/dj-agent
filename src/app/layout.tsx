import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://giglift.app'),
  title: "GigLift — AI Lead Finder for Musicians",
  description: "Find your next gig automatically. AI-powered venue discovery, lead scoring, and booking pipeline for DJs, bands, solo artists, and music instructors.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body>
          <div className="app-shell">
            {children}
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function initMobileNav() {
                    document.querySelectorAll('.topbar').forEach(function(topbar) {
                      if (topbar.querySelector('.mobile-nav-toggle')) return;
                      var nav = topbar.querySelector('.topbar-nav');
                      if (!nav) return;
                      var btn = document.createElement('button');
                      btn.className = 'mobile-nav-toggle';
                      btn.setAttribute('aria-label', 'Toggle navigation');
                      btn.textContent = '\\u2630';
                      btn.addEventListener('click', function() {
                        var open = nav.classList.toggle('mobile-open');
                        btn.textContent = open ? '\\u2715' : '\\u2630';
                      });
                      nav.parentNode.insertBefore(btn, nav);
                    });
                  }
                  var observer = new MutationObserver(function() { initMobileNav(); });
                  observer.observe(document.body, { childList: true, subtree: true });
                  document.addEventListener('DOMContentLoaded', initMobileNav);
                })();
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
