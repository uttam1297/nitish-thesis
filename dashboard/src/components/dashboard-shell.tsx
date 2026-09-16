import Link from "next/link";

const navigation = [
  ["Overview", "/"],
  ["Questions", "/questions"],
  ["Participants", "/participants"],
  ["All Responses", "/responses"],
  ["Data Structure", "/data-structure"],
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to dashboard content
      </a>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">TD</span>
          <span>
            <strong>Thesis Data</strong>
            <small>Research observatory</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="content-shell" id="main-content">
        {children}
      </div>
      <footer>
        <strong>Public research notice.</strong> Participant identities are
        pseudonymous. This dashboard presents descriptive thesis-research data
        and does not generate AI conclusions.
      </footer>
    </div>
  );
}
