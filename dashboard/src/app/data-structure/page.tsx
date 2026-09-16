import { DataModelGraph } from "@/components/data-model-graph";
import { databaseRelationships, logicalRelationships, schemaCatalogue } from "@/lib/research-metadata";
import { getDashboardData } from "@/lib/research/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DataStructurePage() {
  const { snapshot } = await getDashboardData();
  const counts: Record<string, number> = {
    studies: snapshot.studies.length, questionnaire_versions: snapshot.questionnaireVersions.length,
    participants: snapshot.participants.length, sessions: snapshot.sessions.length,
    responses: snapshot.responses.length, consents: snapshot.consents.length,
  };
  return <main className="page model-page">
    <header className="page-header"><div><p className="eyebrow">Research architecture</p><h1>Data model</h1><p className="lede">How the research records relate—from study setup to consent and individual answers. Select any table to inspect its research role.</p></div><span className="record-count">6 production tables</span></header>
    <section className="model-hero" aria-labelledby="model-graph-title"><div className="section-heading"><div><h2 id="model-graph-title">Research record relationships</h2><p>Solid lines are database-enforced links. Dashed relationships are checked by the application and questionnaire catalogue.</p></div></div>
      <DataModelGraph tables={Object.values(schemaCatalogue)} counts={counts} relationships={databaseRelationships} logicalRelationships={logicalRelationships} />
    </section>
    <section aria-labelledby="flow-title"><div className="section-heading"><div><h2 id="flow-title">Research data flow</h2><p>A plain-language view for reviewing how records are created and become descriptive dashboard metrics.</p></div></div>
      <ol className="research-flow"><li><b>Study</b><span>Defines the research context</span></li><li><b>Questionnaire version</b><span>Locks wording and routing</span></li><li><b>Participant</b><span>Receives a pseudonymous code</span></li><li><b>Session & consent</b><span>Captures participation agreement</span></li><li><b>Response records</b><span>Stores structured answers</span></li><li><b>Dashboard metrics</b><span>Summarises evidence coverage</span></li></ol>
    </section>
    <aside className="security-callout"><strong>Protected by design.</strong> UUIDs, resume-token hashes and client request IDs are never included in the dashboard data projection. Narrative answers remain server-redacted where policy requires it.</aside>
  </main>;
}
