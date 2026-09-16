import {
  databaseRelationships,
  logicalRelationships,
  schemaCatalogue,
} from "@/lib/research-metadata";
import { getDashboardData } from "@/lib/research/dashboard-data";
import { humanize } from "@/lib/research/format";

export const dynamic = "force-dynamic";

export default async function DataStructurePage() {
  const { snapshot } = await getDashboardData();
  const counts: Record<string, number> = {
    studies: snapshot.studies.length,
    questionnaire_versions: snapshot.questionnaireVersions.length,
    participants: snapshot.participants.length,
    sessions: snapshot.sessions.length,
    responses: snapshot.responses.length,
    consents: snapshot.consents.length,
  };

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Backend observability</p>
          <h1>Data Structure</h1>
          <p className="lede">
            A human-readable catalogue of the six production research tables,
            their fields, and the relationships the application relies on.
          </p>
        </div>
      </header>
      <section className="panel">
        <h2>Research record hierarchy</h2>
        <div
          className="relationship-flow"
          aria-label="Study contains questionnaire versions. Sessions connect participants, responses and consents."
        >
          <span>Study</span>
          <b>→</b>
          <span>Questionnaire Version</span>
          <b>→</b>
          <span>Session</span>
          <b>→</b>
          <span>Participant · Responses · Consent</span>
        </div>
        <p className="muted small">
          A participant is the pseudonymous person record; a session is the
          interview attempt carrying questionnaire version, stage, mode and
          status.
        </p>
      </section>
      <section>
        <h2>Tables</h2>
        {Object.values(schemaCatalogue).map((table) => (
          <article className="panel" key={table.name}>
            <header className="page-header">
              <div>
                <p className="eyebrow">{table.name}</p>
                <h3>{table.purpose}</h3>
              </div>
              <strong>{counts[table.name]} live rows</strong>
            </header>
            <div className="table-wrap">
              <table>
                <caption>{humanize(table.name)} fields</caption>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Nullable</th>
                    <th>Default / source</th>
                    <th>Meaning</th>
                    <th>Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {table.fields.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <code>{field.name}</code>
                        {field.name === table.primaryKey && (
                          <>
                            <br />
                            <span className="badge">Primary key</span>
                          </>
                        )}
                      </td>
                      <td>{field.type}</td>
                      <td>{field.nullable ? "Yes" : "No"}</td>
                      <td>
                        {field.default ??
                          field.source ??
                          "Application supplied"}
                      </td>
                      <td>
                        {field.meaning}
                        {field.caveats?.map((caveat) => (
                          <small className="muted" key={caveat}>
                            <br />
                            {caveat}
                          </small>
                        ))}
                      </td>
                      <td>
                        <span
                          className={`badge ${field.publicVisibility === "never" ? "warning" : ""}`}
                        >
                          {field.visibility}
                        </span>
                        {field.publicVisibility === "never" && (
                          <>
                            <br />
                            <strong>Actual values never displayed</strong>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.checkConstraints.length > 0 && (
              <p className="small">
                <strong>Checks:</strong>{" "}
                {table.checkConstraints
                  .map((constraint) => constraint.expression)
                  .join("; ")}
              </p>
            )}
            {table.uniqueConstraints.length > 0 && (
              <p className="small">
                <strong>Unique:</strong>{" "}
                {table.uniqueConstraints
                  .map((constraint) => constraint.fields.join(" + "))
                  .join("; ")}
              </p>
            )}
            {table.caveats.map((caveat) => (
              <p className="definition" key={caveat}>
                {caveat}
              </p>
            ))}
          </article>
        ))}
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>Database-enforced relationships</h2>
          <ul>
            {databaseRelationships.map((relationship) => (
              <li key={relationship.id}>
                <code>{relationship.technicalLabel}</code>
                <br />
                <span className="muted">{relationship.explanation}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Logical application expectations</h2>
          <p className="muted small">
            These are checked by application logic; they are not represented as
            foreign keys.
          </p>
          <ul>
            {logicalRelationships.map((relationship) => (
              <li key={relationship.id}>
                <code>{relationship.source}</code> should agree with{" "}
                <code>{relationship.expectedAgreement}</code>
                <br />
                <span className="muted">{relationship.explanation}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <p className="definition">
        <strong>Security boundary:</strong>{" "}
        <code>sessions.resume_token_hash</code> and{" "}
        <code>sessions.client_request_id</code> are documented conceptually
        only. Their values are excluded from dashboard queries and can never be
        displayed.
      </p>
    </main>
  );
}
