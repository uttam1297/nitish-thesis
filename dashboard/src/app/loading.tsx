export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Thesis Data Dashboard</p>
      <h1>Loading research data…</h1>
      <div className="loading-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
