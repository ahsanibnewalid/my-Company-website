"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, LayoutDashboard, LogOut, Settings2, ShieldCheck } from "lucide-react";

type Submission = {
  id: string; kind: "project" | "career"; status: "new" | "reviewing" | "closed";
  name: string; email: string; organization: string; track: string; message: string; created_at: string;
};
type Project = { id: string; title: string; description: string; status: "planning" | "active" | "completed"; url: string; featured: boolean };
type Settings = { tagline: string; founder_name: string; contact_email: string; location: string };
type Data = { summary: { inquiries: number; applications: number; projects: number; new_submissions: number }; submissions: Submission[]; projects: Project[]; settings: Settings };
type Tab = "overview" | "messages" | "projects" | "website";

const blankProject = { title: "", description: "", status: "active" as Project["status"], url: "", featured: true };

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { detail?: string };
  if (response.status === 401) {
    window.location.replace("/admin/login");
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(result.detail || "The request could not be completed.");
  return result;
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [project, setProject] = useState(blankProject);
  const [settings, setSettings] = useState<Settings>({ tagline: "", founder_name: "", contact_email: "", location: "" });

  const refresh = useCallback(async () => {
    try {
      const result = await api<Data>("/api/admin/data");
      setData(result);
      setSettings(result.settings);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the dashboard.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function change(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true); setNotice(""); setError("");
    try { await action(); await refresh(); setNotice(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Update failed."); }
    finally { setBusy(false); }
  }

  function saveProject(event: FormEvent) {
    event.preventDefault();
    void change(async () => {
      await api(editingId ? `/api/admin/projects/${editingId}` : "/api/admin/projects",
        editingId ? "PATCH" : "POST", project);
      setEditingId(null); setProject(blankProject);
    }, editingId ? "Project updated." : "Project created.");
  }

  function editProject(item: Project) {
    setEditingId(item.id);
    setProject({ title: item.title, description: item.description, status: item.status, url: item.url, featured: item.featured });
    setTab("projects");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(url: string, label: string) {
    if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    void change(() => api(url, "DELETE"), `${label} deleted.`);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  if (loading) return <main className="portal-shell"><p className="portal-loading">Loading your company dashboard…</p></main>;
  if (!data) return <main className="portal-shell"><div className="portal-empty">
    <h1>Dashboard unavailable</h1><p>{error || "Check your database connection and server settings."}</p>
    <button className="btn btn-outline" onClick={() => { setLoading(true); void refresh(); }}>Retry</button>
    <p><Link href="/admin/login">Administrator sign-in</Link></p>
  </div></main>;

  const filtered = data.submissions.filter(s => filter === "all" || s.kind === filter || s.status === filter);
  const tabs: { value: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "messages", label: "Messages", icon: ClipboardList },
    { value: "projects", label: "Projects", icon: BriefcaseBusiness },
    { value: "website", label: "Website", icon: Settings2 },
  ];

  return <main className="portal-shell"><div className="portal-layout">
    <aside className="portal-sidebar">
      <Link href="/" className="auth-brand">✦ axiom<span>labs</span></Link>
      <div className="portal-side-label">OWNER DASHBOARD</div>
      {tabs.map(item => <button key={item.value} type="button" className={`owner-nav ${tab === item.value ? "selected" : ""}`} onClick={() => setTab(item.value)}><item.icon size={18}/>{item.label}</button>)}
      <div className="portal-side-details"><span className="portal-avatar">A</span><div><b>Administrator</b><small>Private company access</small></div></div>
      <button type="button" className="portal-logout" onClick={() => void logout()}><LogOut size={16}/> Sign out</button>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><span><ShieldCheck size={17}/> Protected owner session</span><Link href="/">View public website ↗</Link></header>
      <div className="portal-content">
        <div className="eyebrow">AXIOM LABS · OWNER CONTROL</div>
        <h1>{tabs.find(t => t.value === tab)?.label}</h1>
        <p className="portal-lead">One place for messages, projects and website details.</p>
        {error && <div className="portal-notice portal-error" role="alert">{error}</div>}
        {notice && <div className="portal-notice" role="status">{notice}</div>}

        {tab === "overview" && <>
          <div className="portal-metrics owner-metrics">
            <div><ClipboardList/><strong>{data.summary.inquiries}</strong><span>Project inquiries</span></div>
            <div><ClipboardList/><strong>{data.summary.applications}</strong><span>Applications</span></div>
            <div><BriefcaseBusiness/><strong>{data.summary.projects}</strong><span>Projects</span></div>
            <div><ShieldCheck/><strong>{data.summary.new_submissions}</strong><span>New messages</span></div>
          </div>
          <section className="portal-panel"><h2>What needs attention?</h2>
            <p>You have {data.summary.new_submissions} new message{data.summary.new_submissions === 1 ? "" : "s"} waiting for review.</p>
            <button className="btn btn-primary" type="button" onClick={() => { setFilter("new"); setTab("messages"); }}>Review new messages</button>
          </section>
        </>}

        {tab === "messages" && <section className="portal-panel">
          <div className="owner-panel-heading"><div><h2>Inquiries & applications</h2><p>Review incoming forms and mark your progress.</p></div>
            <select aria-label="Filter messages" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All messages</option><option value="new">New</option><option value="reviewing">Reviewing</option><option value="closed">Closed</option><option value="project">Project inquiries</option><option value="career">Career applications</option>
            </select></div>
          <div className="owner-items">{filtered.map(item => <article className="owner-item" key={item.id}>
            <div className="owner-item-head"><div><span className="eyebrow">{item.kind === "career" ? "CAREER APPLICATION" : "PROJECT INQUIRY"} · {new Date(item.created_at).toLocaleDateString()}</span>
              <h3>{item.name}</h3><a href={`mailto:${item.email}`}>{item.email}</a>
              {(item.organization || item.track) && <small>{[item.organization, item.track].filter(Boolean).join(" · ")}</small>}</div>
              <select aria-label={`Status of message from ${item.name}`} disabled={busy} value={item.status} onChange={e => void change(() => api(`/api/admin/submissions/${item.id}`, "PATCH", { status: e.target.value }), "Message status saved.")}>
                <option value="new">New</option><option value="reviewing">Reviewing</option><option value="closed">Closed</option>
              </select></div>
            <p className="owner-message">{item.message}</p>
            <div className="owner-actions"><a className="btn btn-outline" href={`mailto:${item.email}`}>Reply by email</a>
              <button type="button" className="btn btn-outline" disabled={busy} onClick={() => remove(`/api/admin/submissions/${item.id}`, `message from ${item.name}`)}>Delete</button></div>
          </article>)}{!filtered.length && <p className="portal-empty-inline">Nothing here yet.</p>}</div>
        </section>}

        {tab === "projects" && <div className="owner-sections">
          <section className="portal-panel"><h2>{editingId ? "Edit project" : "Add a project"}</h2>
            <form className="owner-form" onSubmit={saveProject}>
              <label>Project title<input required minLength={3} maxLength={140} value={project.title} onChange={e => setProject({ ...project, title: e.target.value })}/></label>
              <label>Description<textarea rows={4} maxLength={2000} value={project.description} onChange={e => setProject({ ...project, description: e.target.value })}/></label>
              <div className="owner-two-cols"><label>Status<select value={project.status} onChange={e => setProject({ ...project, status: e.target.value as Project["status"] })}><option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
                <label>Public URL (optional)<input type="url" placeholder="https://..." value={project.url} onChange={e => setProject({ ...project, url: e.target.value })}/></label></div>
              <label className="owner-check"><input type="checkbox" checked={project.featured} onChange={e => setProject({ ...project, featured: e.target.checked })}/> Show on public website</label>
              <div className="owner-actions"><button className="btn btn-primary" disabled={busy} type="submit">{editingId ? "Save changes" : "Create project"}</button>
                {editingId && <button type="button" className="btn btn-outline" onClick={() => { setEditingId(null); setProject(blankProject); }}>Cancel edit</button>}</div>
            </form>
          </section>
          <section className="portal-panel"><h2>Projects ({data.projects.length})</h2>
            <div className="owner-items">{data.projects.map(item => <article key={item.id} className="owner-item"><div className="owner-item-head"><div><h3>{item.title}</h3><small>{item.status} · {item.featured ? "Visible on website" : "Private"}</small></div></div>
              <p>{item.description || "No description"}</p>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">Visit project ↗</a>}
              <div className="owner-actions"><button className="btn btn-outline" onClick={() => editProject(item)}>Edit</button>
                <button className="btn btn-outline" disabled={busy} onClick={() => remove(`/api/admin/projects/${item.id}`, item.title)}>Delete</button></div></article>)}
              {!data.projects.length && <p className="portal-empty-inline">No projects yet. Add one above.</p>}</div>
          </section>
        </div>}

        {tab === "website" && <section className="portal-panel"><h2>Website details</h2><p>Changes will appear on the public homepage.</p>
          <form className="owner-form" onSubmit={event => { event.preventDefault(); void change(() => api("/api/admin/settings", "PATCH", settings), "Website details saved."); }}>
            <label>Homepage tagline<textarea maxLength={220} rows={3} value={settings.tagline} onChange={e => setSettings({ ...settings, tagline: e.target.value })}/></label>
            <label>Founder name<input maxLength={100} value={settings.founder_name} onChange={e => setSettings({ ...settings, founder_name: e.target.value })}/></label>
            <label>Contact email<input type="email" maxLength={254} value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })}/></label>
            <label>Location<input maxLength={120} value={settings.location} onChange={e => setSettings({ ...settings, location: e.target.value })}/></label>
            <button type="submit" disabled={busy} className="btn btn-primary">Save website details</button>
          </form>
        </section>}
      </div>
    </div>
  </div></main>;
}
