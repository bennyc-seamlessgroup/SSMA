import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="route-error-page">
      <section className="route-error-card">
        <span>404</span>
        <h1>Page not found.</h1>
        <p>The requested workspace page does not exist.</p>
        <Link className="button light-primary" href="/login">Back to login</Link>
      </section>
    </main>
  );
}
