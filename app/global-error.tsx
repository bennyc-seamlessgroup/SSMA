'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="route-error-page">
          <section className="route-error-card">
            <span>Application error</span>
            <h1>Something went wrong.</h1>
            <p>{error.message || 'The application could not be loaded.'}</p>
            <button className="button light-primary" type="button" onClick={reset}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
