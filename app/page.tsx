"use client";
import { useState, useEffect } from "react";
type Catalog = { connected: boolean; email?: string; models: Array<{ slug: string; display_name: string }> };
export default function Home() {
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("");
  const [job, setJob] = useState<{ id: string; status: string; model: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; logs: string[]; pullRequestUrl?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ connected: false, models: [] });
  const [model, setModel] = useState("");

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
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/"><span aria-hidden="true">◆</span> My Agent</a>
        <div className="account">
          {catalog.connected ? <>
            <span className="connection">● ChatGPT connected</span>
            <span className="avatar" aria-hidden="true">{(catalog.email || "U")[0].toUpperCase()}</span>
            <span className="account-name" title={catalog.email}>{catalog.email || "Connected account"}</span>
            <details className="account-menu"><summary className="button secondary">Manage account ⌄</summary><div className="account-popover"><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage usage ↗</a><a href="/api/auth/chatgpt/start">Reconnect ChatGPT</a></div></details>
          </> : <><span className="muted">Use your ChatGPT plan</span><a className="button primary" href="/api/auth/chatgpt/start">Connect ChatGPT ↗</a></>}
        </div>
      </header>
      <main>
        <section className="intro"><h1>You imagine it. <span>We build it for you.</span></h1><p>Turn a requirement into a pull request.</p></section>
        {message && <p className="feedback" role="status">{message}</p>}
        <form className="workspace" onSubmit={async (event) => { event.preventDefault(); setMessage(""); setBusy(true); setJob(null); try { const form = new FormData(event.currentTarget); const response = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requirement: brief, repository: form.get("repository"), baseBranch: form.get("branch"), model: form.get("model") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not start the agent."); setJob(result); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the agent."); } finally { setBusy(false); } }}>
          <section className="card brief-card">
            <div className="card-heading"><h2><label htmlFor="requirement">What are we building?</label></h2><span className="chip">Text brief</span></div>
            <textarea id="requirement" required minLength={10} maxLength={10000} value={brief} onChange={event => setBrief(event.target.value)} placeholder="Describe the change you want to make…" aria-describedby="brief-help" />
            <div className="editor-note"><span id="brief-help">Be specific about the result you expect.</span><span>{brief.length.toLocaleString()} / 10,000</span></div>
          </section>
          <section className="card settings-card" aria-labelledby="settings-title">
            <h2 id="settings-title">Run settings</h2>
            <label>Agent<select defaultValue="frontend"><option value="frontend">Frontend Developer</option></select></label>
            <label>GitHub repository<input name="repository" required defaultValue="sauing/ecc-website" spellCheck={false} /></label>
            <label>Base branch<input name="branch" required defaultValue="main" spellCheck={false} /></label>
            <label>AI model<select name="model" value={model} onChange={event => setModel(event.target.value)} disabled={!catalog.connected || !catalog.models.length} required><option value="">{catalog.connected ? "No models available" : "Connect ChatGPT first"}</option>{catalog.models.map(option => <option key={option.slug} value={option.slug}>{option.display_name}</option>)}</select></label>
            <button className="button primary build-button" type="submit" disabled={!catalog.connected || !model || busy || (!!job && !["completed", "failed"].includes(job.status))}>{busy ? "Starting…" : job && !["completed", "failed"].includes(job.status) ? "Agent is working…" : "Build it for me"} <span aria-hidden="true">↗</span></button>
            <p className="review-note">You review every pull request.</p>
          </section>
        </form>
        <details className="activity card" key={job?.id || "idle"}>
          <summary><strong>Run activity</strong><span className={job?.status === "failed" ? "run-status failed" : "run-status"}>{busy ? "Starting…" : job ? job.status.replaceAll("_", " ") : "No active run"}</span><span className="token-total">Tokens <b>{job ? job.usage.totalTokens.toLocaleString() : "—"}</b></span><span className="chevron" aria-hidden="true">⌄</span></summary>
          <div className="activity-content">
            {job ? <><div className="usage"><span>Model <b>{job.model}</b></span><span>Input <b>{job.usage.inputTokens.toLocaleString()}</b></span><span>Output <b>{job.usage.outputTokens.toLocaleString()}</b></span>{job.pullRequestUrl && <a href={job.pullRequestUrl} target="_blank" rel="noreferrer">Open pull request ↗</a>}</div><pre>{job.logs.join("\n")}</pre></> : <p className="muted">Your agent’s progress, token usage and pull request will appear here.</p>}
          </div>
        </details>
        <footer>Built for the ideas you haven’t shipped yet.</footer>
      </main>
    </div>
  );
}
