"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronRight, Database, LockKeyhole, X } from "lucide-react";

type Field = { name: string; type: string; nullable: boolean; meaning: string; visibility: string; publicVisibility: string; caveats?: readonly string[] };
type Table = { name: string; purpose: string; fields: readonly Field[]; uniqueConstraints: readonly { fields: readonly string[]; meaning: string }[]; checkConstraints: readonly { expression: string; meaning: string }[] };
type Relationship = { id: string; sourceTable: string; targetTable: string; technicalLabel: string; explanation: string };

type NodeData = { table: Table; count: number; selected?: boolean };

function TableNode({ data }: NodeProps<Node<NodeData>>) {
  const { table, count, selected } = data;
  return <div className={`flow-table-node ${selected ? "selected" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <span className="flow-node-icon"><Database size={15} /></span>
    <p>{table.name.replace("_", " ")}</p>
    <strong>{table.purpose}</strong>
    <span className="flow-count">{count.toLocaleString()} live {count === 1 ? "record" : "records"}</span>
    <Handle type="source" position={Position.Right} />
  </div>;
}

const nodeTypes = { table: TableNode };
const positions: Record<string, { x: number; y: number }> = {
  studies: { x: 20, y: 145 }, questionnaire_versions: { x: 320, y: 145 },
  participants: { x: 310, y: 405 }, sessions: { x: 640, y: 275 },
  responses: { x: 970, y: 125 }, consents: { x: 970, y: 430 },
};

export function DataModelGraph({ tables, counts, relationships, logicalRelationships }: {
  tables: readonly Table[]; counts: Record<string, number>; relationships: readonly Relationship[];
  logicalRelationships: readonly { id: string; source: string; expectedAgreement: string; explanation: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = useMemo<Node<NodeData>[]>(() => tables.map((table) => ({ id: table.name, type: "table", position: positions[table.name] ?? { x: 0, y: 0 }, data: { table, count: counts[table.name] ?? 0, selected: selected === table.name } })), [tables, counts, selected]);
  const edges = useMemo<Edge[]>(() => relationships.map((relationship) => ({
    id: relationship.id, source: relationship.sourceTable, target: relationship.targetTable,
    label: "1 : many", type: "smoothstep", animated: false,
    style: { stroke: selected && ![relationship.sourceTable, relationship.targetTable].includes(selected) ? "#d9dce2" : "#51627b", strokeWidth: selected ? 2 : 1.4 },
    labelStyle: { fontSize: 10, fill: "#667085" }, labelBgStyle: { fill: "#fafafa", fillOpacity: 0.9 },
  })), [relationships, selected]);
  const table = tables.find((item) => item.name === selected);
  return <div className="data-model-explorer">
    <div className="relationship-legend" aria-label="Relationship legend">
      <span><i className="legend-line fk" />Database-enforced foreign key</span>
      <span><i className="legend-line logical" />Logical / mirrored relationship</span>
      <span className="legend-tip">Select a table to inspect fields</span>
    </div>
    <div className="flow-canvas">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.38} onNodeClick={(_, node) => setSelected(node.id)} onPaneClick={() => setSelected(null)}>
        <Background gap={20} size={1} color="#e8ebef" />
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable nodeColor="#e6eaf0" />
      </ReactFlow>
    </div>
    {table && <aside className="model-inspector" aria-label={`${table.name} table inspector`}>
      <button onClick={() => setSelected(null)} aria-label="Close table inspector"><X size={16} /></button>
      <p className="eyebrow">Table inspector</p><h3>{table.name.replace("_", " ")}</h3><p>{table.purpose}</p>
      <h4>Fields</h4>
      <ul className="field-list">{table.fields.map((field) => <li key={field.name}>
        <code>{field.name}</code><span>{field.type}{field.nullable ? " · optional" : " · required"}</span><p>{field.meaning}</p>
        {field.publicVisibility === "never" && <em><LockKeyhole size={12} />Never displayed</em>}
      </li>)}</ul>
      {(table.uniqueConstraints.length > 0 || table.checkConstraints.length > 0) && <><h4>Constraints</h4><ul className="constraints">{table.uniqueConstraints.map((item) => <li key={item.fields.join()}><ChevronRight size={14} />Unique: {item.fields.join(", ")}</li>)}{table.checkConstraints.map((item) => <li key={item.expression}><ChevronRight size={14} />{item.meaning}</li>)}</ul></>}
      <h4>Connected records</h4><ul className="constraints">{relationships.filter((item) => item.sourceTable === table.name || item.targetTable === table.name).map((item) => <li key={item.id}><ChevronRight size={14} />{item.explanation}</li>)}</ul>
    </aside>}
    <details className="logical-relationships"><summary>Logical relationships ({logicalRelationships.length})</summary><ul>{logicalRelationships.map((item) => <li key={item.id}><code>{item.source}</code><ChevronRight size={13} /><code>{item.expectedAgreement}</code><span>{item.explanation}</span></li>)}</ul></details>
  </div>;
}
