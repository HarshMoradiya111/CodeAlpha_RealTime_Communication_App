const highlights = [
  'Multi-user video calls with room signaling',
  'Screen sharing and collaborative whiteboard in later phases',
  'File sharing via upload links',
  'JWT auth and HTTPS-ready deployment notes',
];

function App() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">CodeAlpha Internship</p>
        <h1>CodeAlpha RealTime Communication App</h1>
        <p className="intro">
          Phase 1 scaffold is ready. The repo is organized for a signaling backend
          and a browser-based WebRTC client so the next phases can focus on room
          setup, live media, and collaboration tools.
        </p>
        <div className="status-row">
          <span className="status-pill">Phase 1 complete</span>
          <span className="status-note">Waiting for your confirmation before Phase 2</span>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Backend</h2>
          <p>Express server with MongoDB and Socket.io wiring prepared.</p>
        </article>
        <article className="info-card">
          <h2>Frontend</h2>
          <p>React + Vite starter prepared for the call room interface.</p>
        </article>
        <article className="info-card">
          <h2>Next work</h2>
          <ul>
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

export default App;
