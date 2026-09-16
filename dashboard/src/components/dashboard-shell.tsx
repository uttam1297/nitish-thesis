"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChartNoAxesCombined, Database, Files, ShieldCheck, Users } from "lucide-react";

const navigation = [
  ["Overview", "/", ChartNoAxesCombined],
  ["Participants", "/participants", Users],
  ["Questions", "/questions", Files],
  ["Responses", "/responses", Database],
  ["Data model", "/data-structure", Boxes],
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === href : pathname.startsWith(href);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to dashboard content</a>
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">TD</span><span><strong>Thesis Data</strong><small>Research intelligence</small></span></Link>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map(([label, href, Icon]) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={isActive(href) ? "active" : ""}>
              <Icon aria-hidden="true" size={17} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <details className="privacy-note">
          <summary><ShieldCheck size={16} aria-hidden="true" />Privacy protected</summary>
          <p>Participant codes are pseudonymous. Protected narrative content and internal identifiers never reach this dashboard.</p>
        </details>
      </aside>
      <div className="workspace">
        <div className="mobile-bar">
          <Link className="brand" href="/"><span className="brand-mark">TD</span><strong>Thesis Data</strong></Link>
          <nav aria-label="Mobile navigation">
            {navigation.map(([label, href, Icon]) => <Link key={href} href={href} aria-label={label} className={isActive(href) ? "active" : ""}><Icon size={17} /></Link>)}
          </nav>
        </div>
        <div className="content-shell" id="main-content">{children}</div>
      </div>
    </div>
  );
}
