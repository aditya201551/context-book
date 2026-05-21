const PRINCIPLES = [
  { num: 'I',   title: 'Insights, not logs', desc: 'Store the compressed lesson, not the transcript. A library, not a tape recorder.' },
  { num: 'II',  title: 'Retrieval by intent', desc: 'Memory should be summoned by what you mean, not by what you typed. Embeddings, not keywords.' },
  { num: 'III', title: 'Cache, not source', desc: 'ContextBook is a memory layer, not the system of record. Designed to be rebuildable.' },
  { num: 'IV',  title: 'Forgetting is a feature', desc: 'Decay, expiry, and selective deletion are first-class. Memory you can\'t prune becomes noise.' },
  { num: 'V',   title: 'Cross-tool', desc: 'A memory is a memory. The agent that wrote it should not own the right to read it.' },
];

export default function LandingPrinciples() {
  return (
    <section className="section" id="principles">
      <div className="section-hd reveal">
        <div className="section-greek">Arche · first principles</div>
        <h2 className="section-title">
          Six convictions about<br/>
          <em>machine memory.</em>
        </h2>
      </div>
      <div className="princ-grid">
        {PRINCIPLES.map((p, i) => (
          <div key={p.num} className={`princ reveal reveal-delay-${(i % 3) + 1}`}>
            <div className="princ-num">{p.num}</div>
            <div className="princ-title"><em>{p.title}</em></div>
            <div className="princ-desc">{p.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
