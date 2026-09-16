import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <p className="eyebrow">Not found</p>
      <h1>This research record does not exist.</h1>
      <p>
        The participant code or question ID is not present in the current
        dataset and metadata catalogue.
      </p>
      <Link className="button" href="/">
        Return to overview
      </Link>
    </main>
  );
}
