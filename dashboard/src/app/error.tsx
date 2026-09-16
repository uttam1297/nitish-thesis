"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="page">
      <p className="eyebrow">Data unavailable</p>
      <h1>The research dataset could not be loaded.</h1>
      <p>This is different from a valid query with no matching records. No data has been changed.</p>
      <button className="button" type="button" onClick={() => retry()}>
        Try again
      </button>
    </main>
  );
}
