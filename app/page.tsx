"use client";
import { useState, useEffect } from "react";
type Catalog = { connected: boolean; email?: string; models: Array<{ slug: string; display_name: string }> };
const employees = [
  { id: "software-builder", name: "Software Builder", icon: "⌘", description: "Turns your idea into a tested GitHub pull request.", prompt: "Build this change for me. Explain the result in simple terms, update the relevant files, run the available checks, and open a pull request for my review." },
  { id: "website-care", name: "Website Caretaker", icon: "◈", description: "Keeps your website healthy, clear, and up to date.", prompt: "Review the website and make this improvement. Keep the design consistent, make it work on mobile, run the available checks, and open a pull request with a plain-language summary." },
  { id: "content-helper", name: "Content Helper", icon: "✦", description: "Prepares useful content and website changes that support it.", prompt: "Help me improve the content for this audience. Make the necessary website changes, keep the tone friendly, check the result, and open a pull request. Do not publish anything automatically." },
  { id: "growth-guide", name: "Growth Guide", icon: "↗", description: "Finds practical improvements for visitors and conversions.", prompt: "Suggest and implement the smallest useful improvement for visitors and conversions. Show your reasoning in the pull request, make only safe repository changes, and leave anything external for my approval." },
];
export default function Home() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("");
  const [job, setJob] = useState<{ id: string; status: string; employee?: string; model: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; logs: string[]; pullRequestUrl?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ connected: false, models: [] });
  const [model, setModel] = useState("");
  const [employee, setEmployee] = useState(employees[0].id);
  const selectedEmployee = employees.find(item => item.id === employee) || employees[0];

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("siwc")) {
      const result = query.get("siwc");
      setMessage(result === "connected" ? "ChatGPT connected. Choose a model and start your task." : result === "denied" ? "ChatGPT sign-in was cancelled. You can connect whenever you’re ready." : "ChatGPT sign-in didn’t complete. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    void fetch("/api/chatgpt/status", { cache: "no-store" }).then(response => response.json()).then((data: Catalog) => {
      setCatalog(data);
      if (data.models.length) setModel(current => data.models.some(option => option.slug === current) ? current : data.models[0].slug);
    }).catch(() => setMessage("Could not check ChatGPT connection. Refresh the page to try again."));
  }, []);

  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.status)) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/jobs/${job.id}`);
      if (response.ok) setJob(await response.json());
    }, 1500);
    return () => clearInterval(timer);
  }, [job]);
  const running = busy || (!!job && !["completed", "failed"].includes(job.status));
  const examples = [
    { label: "Add a contact form", text: "Add an accessible contact form to the website with clear labels and helpful validation messages." },
    { label: "Fix the mobile menu", text: "Improve the mobile navigation so it is easy to open, close, and use on a small screen." },
    { label: "Refresh homepage copy", text: "Rewrite the homepage copy to clearly explain what we offer and help visitors take the next step." },
    { label: "Improve page titles", text: "Improve the website page titles and descriptions using the existing content. Avoid unsupported claims." },
  ];
  return (
    <div className="atelier">
      <a className="skip-link" href="#request">Skip to your request</a>
      <aside className="sidebar">
        <a className="brand" href="/">My Agent<span>THE ATELIER</span></a>
        <nav aria-label="Workspace">
          <a className="nav-link active" href="#workspace"><span aria-hidden="true">＋</span> New task</a>
          <a className="nav-link" href="#activity"><span aria-hidden="true">◷</span> Activity</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link" href="#settings"><span aria-hidden="true">⚙</span> Project settings</a>
          <button className="nav-link" type="button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen}><span aria-hidden="true">?</span> How it works</button>
          <div className="sidebar-note">A little help.<br /><em>A world of possibilities.</em></div>
        </div>
      </aside>
      <main id="workspace">
        <header className="topbar">
          <span className="eyebrow">YOUR IDEAS, TAKING SHAPE</span>
          <div className="account">
            {catalog.connected ? <details className="account-menu"><summary><span className="status-dot" /> Connected <span className="avatar">{(catalog.email || "U")[0].toUpperCase()}</span></summary><div className="account-popover"><p>{catalog.email || "Connected account"}</p><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage usage ↗</a><a href="/api/auth/chatgpt/start">Reconnect ChatGPT</a></div></details> : <a href="/api/auth/chatgpt/start" className="account-connect">Connect ChatGPT ↗</a>}
          </div>
        </header>
        <section className="intro">
          <div><h1>Make room for your<br className="hero-break" /> next idea<span>.</span></h1><p>Your repository, a helpful AI partner, and a calm way to build.</p></div>
          <div className="handwritten" aria-hidden="true">Ideas<br />code<br />content<br />growth<br /><span>together.</span></div>
        </section>
        {helpOpen && <section className="help-panel" aria-label="How it works"><div><strong>01 · Choose</strong><p>Pick a helper and describe what you want in everyday language.</p></div><div><strong>02 · Build</strong><p>Your helper edits your repository in a separate branch and runs the available checks.</p></div><div><strong>03 · Review</strong><p>Open the pull request—a proposed set of changes—and review before merging.</p></div><button type="button" aria-label="Close guide" onClick={() => setHelpOpen(false)}>×</button></section>}
        {message && <p className="feedback" role="status">{message}</p>}
        <section className="employee-grid" aria-label="Choose your helper">
          {employees.map((item, index) => <button type="button" key={item.id} aria-pressed={employee === item.id} disabled={running} className={`employee-option employee-${index} ${employee === item.id ? "selected" : ""}`} onClick={() => setEmployee(item.id)}>
            <span className="employee-number">0{index + 1}</span>
            <strong>{item.name}</strong>
            <span className="employee-description">{item.description}</span>
            <span className={`employee-art art-${index}`} aria-hidden="true" />
            <span className="choose-role"><span className="radio-mark" aria-hidden="true">{employee === item.id ? "•" : ""}</span><span>{employee === item.id ? "Selected" : "Choose"} {item.name}</span><span aria-hidden="true">↗</span></span>
          </button>)}
        </section>
        <form className="workspace" onSubmit={async event => {
          event.preventDefault(); setMessage(""); setBusy(true); setJob(null);
          try {
            const form = new FormData(event.currentTarget);
            const requirement = `${selectedEmployee.prompt}\n\nMy specific request: ${brief}`;
            const response = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requirement, employee: selectedEmployee.name, repository: form.get("repository"), baseBranch: form.get("branch"), model }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Could not start your helper.");
            setJob(result);
          } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start your helper."); }
          finally { setBusy(false); }
        }}>
          <section className="card brief-card" id="request">
            <div className="card-heading"><h2><label htmlFor="requirement">Your request</label></h2><span className="helper-tag">{selectedEmployee.name}</span></div>
            <textarea id="requirement" required minLength={10} maxLength={9500} value={brief} disabled={running} onChange={event => setBrief(event.target.value)} placeholder="Tell your helper what you’d like to do…" aria-describedby="brief-help" />
            <div className="editor-note"><span id="brief-help">Everyday language is perfect. No coding knowledge needed.</span><span>{brief.length.toLocaleString()} / 9,500</span></div>
            <div className="examples"><span>Try an example:</span><div>{examples.map(example => <button type="button" key={example.label} disabled={running} onClick={() => { setBrief(example.text); document.getElementById("requirement")?.focus(); }}><span aria-hidden="true">↗</span>{example.label}</button>)}</div></div>
            <div className="submit-row"><button className="button primary" type="submit" disabled={!catalog.connected || !model || running}><span aria-hidden="true">▷</span>{running ? "Working on your idea…" : "Start my helper"}</button><p>{!catalog.connected ? "Connect ChatGPT in Project settings to get started." : !model ? "Choose an available model to get started." : "Your helper prepares the changes. You review what gets merged."}</p></div>
          </section>
          <div className="right-column">
            <section className="card settings-card" id="settings" aria-labelledby="settings-title">
              <h2 id="settings-title">Project settings</h2>
              <label htmlFor="repository">Repository<input id="repository" name="repository" required defaultValue="sauing/ecc-website" disabled={running} spellCheck={false} placeholder="owner/project" /></label>
              <label htmlFor="branch">Branch<input id="branch" name="branch" required defaultValue="main" disabled={running} spellCheck={false} /></label>
              <label htmlFor="model">AI model<select id="model" name="model" value={model} onChange={event => setModel(event.target.value)} disabled={!catalog.connected || !catalog.models.length || running} required><option value="">{catalog.connected ? "No models available" : "Connect ChatGPT first"}</option>{catalog.models.map(option => <option key={option.slug} value={option.slug}>{option.display_name}</option>)}</select></label>
              <a className="connect-panel" href="/api/auth/chatgpt/start"><span aria-hidden="true">✳</span>{catalog.connected ? "ChatGPT connected" : "Connect ChatGPT"}<span aria-hidden="true">↗</span></a>
              <p className="settings-note">Repository means your project on GitHub. Keep “main” unless you use a different branch.</p>
            </section>
            <section className="card activity" id="activity" aria-labelledby="activity-title">
              <div className="card-heading"><h2 id="activity-title">Run activity</h2><span className="activity-badge">{running ? "In progress" : job ? job.status : "Ready when you are"}</span></div>
              {job ? <div className="job-result"><p role="status">{job.status === "completed" ? "Your changes are ready to review." : job.status === "failed" ? "This run stopped. See the details below." : "Your helper is working on the project."}</p><p className="muted">{job.employee || "Helper"} · {job.usage.totalTokens.toLocaleString()} tokens</p>{job.pullRequestUrl && <a className="review-link" href={job.pullRequestUrl} target="_blank" rel="noreferrer">Review your changes ↗</a>}<details open={job.status === "failed"}><summary>Run details</summary><p className="muted">{job.model} · Input {job.usage.inputTokens.toLocaleString()} · Output {job.usage.outputTokens.toLocaleString()}</p><pre>{job.logs.join("\n")}</pre></details></div> : <div className="empty-activity"><span aria-hidden="true">▤</span><strong>{busy ? "Starting your helper…" : "A fresh page."}</strong><p>Your work will appear here<br />once you start a task.</p></div>}
            </section>
          </div>
        </form>
        <footer><span>Made for the ideas you haven’t shipped yet.</span><span>MY AGENT / ATELIER</span></footer>
      </main>
    </div>
  );
}

