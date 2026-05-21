const STACK = [
  { cat: 'Language',  name: 'Go',          em: 'Go',          note: 'MCP server core' },
  { cat: 'Storage',   name: 'Postgres + pgvector', em: 'pgvector', note: 'unified metadata + embeddings' },
  { cat: 'Embeddings', name: 'Voyage AI',  em: 'Voyage AI',   note: 'multilingual embeddings, high retrieval quality' },
  { cat: 'Index',     name: 'HNSW',         em: 'HNSW',         note: 'm=16, ef_c=64 · recall@10 = 0.952' },
  { cat: 'Transport', name: 'MCP + HTTP',   em: 'MCP',          note: 'streamable JSON-RPC' },
  { cat: 'Deploy',    name: 'Docker Compose', em: 'Docker',     note: 'self-host in one command' },
];

export default function LandingStack() {
  return (
    <section className="section" id="stack">
      <div className="section-hd reveal">
        <div className="section-greek">Materia · the substance</div>
        <h2 className="section-title">
          Boring infrastructure,<br/>
          <em>chosen carefully.</em>
        </h2>
        <p className="section-sub">
          Self-hostable. Cost-aware. No proprietary services in the data path,
          no vendor-lock in the embedding layer.
        </p>
      </div>

      <div className="stack-tablet reveal">
        {STACK.map((s) => (
          <div key={s.cat} className="stack-row">
            <div className="stack-cat">{s.cat}</div>
            <div className="stack-name">
              {s.name.split(s.em).map((part, i, arr) => (
            <>
              {part}
              {i < arr.length - 1 && <em>{s.em}</em>}
            </>
              ))}
            </div>
            <div className="stack-note">{s.note}</div>
          </div>
        ))}
        <div className="stack-engraving">· ΓΝΩΘΙ ΣΕΑΥΤΟΝ ·</div>
      </div>
    </section>
  );
}
