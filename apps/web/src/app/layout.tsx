// Minimal Next.js root layout. This file exists solely to satisfy Next.js
// App Router's requirement that any src/app/ tree has a root layout. The web
// frontend is built by Vite (see vite.config.ts + index.html + app.html),
// while Next.js is only used for the Vercel serverless API deployment at
// src/app/api/[[...all]]/route.ts. This layout is never rendered in practice.
export const metadata = {
  title: 'WordBase API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
