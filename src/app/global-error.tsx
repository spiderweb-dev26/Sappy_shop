"use client";
import RecoveryPanel from "@/components/RecoveryPanel";
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap" />
        <title>Sappy Legacy - recovery</title>
      </head>
      <body style={{ margin: 0 }}>
        <RecoveryPanel message={error?.message} detail={(error as any)?.digest} />
      </body>
    </html>
  );
}