"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList, KeyRound, LayoutDashboard, LifeBuoy, LogOut, Plus, ShieldCheck, Users } from "lucide-react";

type Workspace = { id: string; name: string; status: string; plan: string; role: string; role_code?: string; permissions: string[]; projects?: number|null; open_tickets?: number|null };
type Overview = { persona: "owner"|"staff"|"client"; summary: Record<string, number>; workspaces: Workspace[] };
type Account = { email: string; first_name: string; last_name: string; is_owner: boolean };
type Project = { id: string; name: string; description: string; status: string; updated_at: string };
type Ticket = { id: string; subject: string; message: string; status: string; created_at: string };
type Inquiry = { id: string; kind: "project"|"career"; name: string; email: string; organization: string; track: string; message: string; status: "new"|"reviewing"|"closed"; created_at: string };

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json() as T & { detail?: string };
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Session expired."); }
  if (!response.ok) throw new Error(body.detail || "The request could not be completed.");
  return body;
}

export default function PortalPage() {
  const [overview, setOverview] = useState<Overview|null>(null);
  const [account, setAccount] = useState<Account|null>(null);
  const [selected, setSelected] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryTotal, setInquiryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const overviewData = await readJson<Overview>("/api/portal/overview");
        const user = await readJson<Account>("/api/portal/me");
        const incoming = overviewData.persona === "owner"
          ? await readJson<{ total: number; inquiries: Inquiry[] }>("/api/portal/inquiries").catch((cause: unknown) => {
              if (active) setError(cause instanceof Error ? `Inquiry queue: ${cause.message}` : "Inquiry queue unavailable.");
              return null;
            }) : null;
        if (active) {
          setInquiries(incoming?.inquiries || []);
          setInquiryTotal(incoming?.total || 0);
          setOverview(overviewData); setAccount(user);
          setSelected(overviewData.workspaces.find(w => w.status === "active")?.id || "");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your workspace.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const workspace = useMemo(() => overview?.workspaces.find(w => w.id === selected), [overview, selected]);
  const allowed = useCallback((permission: string) => !!workspace?.permissions.includes("*") || !!workspace?.permissions.includes(permission), [workspace]);

  const loadWorkspace = useCallback(async () => {
    if (!workspace || workspace.status !== "active") return;
    setLoadingWorkspace(true); setError("");
    const headers = { "X-Tenant-ID": workspace.id };
    try {
      // Sequential requests avoid competing refresh-token rotations on session expiry.
      setProjects(allowed("portal.projects.read")
        ? (await readJson<{ projects: Project[] }>("/api/portal/projects", { headers })).projects : []);
      setTickets(allowed("portal.tickets.read")
        ? (await readJson<{ tickets: Ticket[] }>("/api/portal/tickets", { headers })).tickets : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace unavailable."); }
    finally { setLoadingWorkspace(false); }
  }, [workspace, allowed]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!workspace||saving)return;
    setSaving(true);setError("");setNotice("");
    try {
      await readJson<{id:string}>("/api/portal/tickets",{
        method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":workspace.id},
        body:JSON.stringify({subject:ticketSubject,message:ticketMessage}),
      });
      setTicketSubject("");setTicketMessage("");setNotice("Support request created.");
      await loadWorkspace();
    } catch(cause){setError(cause instanceof Error?cause.message:"Could not create request.");}
    finally{setSaving(false);}
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!workspace||saving)return;
    setSaving(true);setError("");setNotice("");
    try {
      await readJson<{id:string}>("/api/portal/projects",{
        method:"POST",headers:{"Content-Type":"application/json","X-Tenant-ID":workspace.id},
        body:JSON.stringify({name:projectName,description:projectDescription}),
      });
      setProjectName("");setProjectDescription("");setNotice("Project created.");
      await loadWorkspace();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not create project.");}
    finally{setSaving(false);}
  }

  async function updateTicket(ticket: Ticket, status: string) {
    if(!workspace)return;
    setError("");setNotice("");
    try {
      await readJson("/api/portal/tickets/"+ticket.id,{
        method:"PATCH",headers:{"Content-Type":"application/json","X-Tenant-ID":workspace.id},
        body:JSON.stringify({status}),
      });
      setNotice("Support request updated."); await loadWorkspace();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not update request.");}
  }

  async function updateInquiry(inquiry: Inquiry, status: Inquiry["status"]) {
    setError(""); setNotice("");
    try {
      await readJson("/api/portal/inquiries/" + inquiry.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setInquiries(current => current.map(item => item.id === inquiry.id ? { ...item, status } : item));
      setNotice("Inquiry status updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update inquiry."); }
  }

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>undefined);
    window.location.assign("/login");
  }

  if(loading)return <main className="portal-shell"><p className="portal-loading">Checking your account and permissions…</p></main>;
  if(!overview)return <main className="portal-shell"><div className="portal-empty"><h1>Workspace unavailable</h1><p>{error||"Please try again."}</p><Link href="/login">Return to sign in</Link></div></main>;

  const personaLabel=overview.persona==="owner"?"Owner & CEO":overview.persona==="staff"?"Team member":"Client";
  const fullName=[account?.first_name,account?.last_name].filter(Boolean).join(" ")||account?.email||"Account";

  return <main className="portal-shell"><div className="portal-layout">
    <aside className="portal-sidebar">
      <Link className="auth-brand" href="/">✦ axiom<span>labs</span></Link>
      <div className="portal-side-label">COMPANY WORKSPACE</div>
      <div className="portal-side-active"><LayoutDashboard size={18}/> Dashboard</div>
      <div className="portal-side-details"><span className="portal-avatar">{fullName.slice(0,1).toUpperCase()}</span><div><b>{fullName}</b><small>{personaLabel}</small></div></div>
      <button className="portal-logout" onClick={logout}><LogOut size={16}/> Sign out</button>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><span><ShieldCheck size={17}/> Secure workspace</span><div>{account?.email} <span className="portal-pill">{personaLabel}</span></div></header>
      <div className="portal-content">
        <div className="eyebrow">{overview.persona==="owner"?"COMPANY CONTROL":"YOUR ORGANIZATION"}</div>
        <h1>{overview.persona==="owner"?"Company overview":overview.persona==="staff"?"Team workspace":"Client portal"}</h1>
        <p className="portal-lead">{overview.persona==="owner"?"Real account and workspace totals from the company database.":overview.persona==="staff"?"Access is limited to your assigned organizations and permissions.":"Review your assigned projects and submit support requests securely."}</p>
        {error&&<div className="portal-notice portal-error" role="alert">{error}</div>}
        {notice&&<div className="portal-notice" role="status">{notice}</div>}

        {overview.persona==="owner"&&<div className="portal-metrics">
          <div><Building2/><strong>{overview.summary.tenants??0}</strong><span>Organizations</span></div>
          <div><CheckCircle2/><strong>{overview.summary.active_tenants??0}</strong><span>Active organizations</span></div>
          <div><Users/><strong>{overview.summary.users??0}</strong><span>Users</span></div>
          <div><BriefcaseBusiness/><strong>{overview.summary.projects??0}</strong><span>Projects</span></div>
        </div>}

        {overview.persona==="owner"&&<section className="portal-panel">
          <div className="portal-heading"><div><h2><ClipboardList size={19}/> Incoming inquiries & applications</h2>
            <p>Private submissions saved in the company database, without an email provider.</p></div>
            <span className="portal-pill">{inquiryTotal} total · {inquiries.filter(item=>item.status==="new").length} new in latest 100</span>
          </div>
          {inquiries.length?<ul className="portal-item-list">{inquiries.map(item=><li key={item.id}>
            <b>{item.kind==="career"?"Career application":"Project inquiry"} · {item.name}</b>
            <small>{item.email} · {item.track||item.organization||"Individual"} · {new Date(item.created_at).toLocaleDateString()}</small>
            <p>{item.message}</p>
            <select aria-label={`Status for ${item.name}`} value={item.status} onChange={event=>void updateInquiry(item,event.target.value as Inquiry["status"])}>
              <option value="new">New</option><option value="reviewing">Reviewing</option><option value="closed">Closed</option>
            </select>
          </li>)}</ul>:<p className="portal-empty-inline">No project inquiries or applications received yet.</p>}
          {inquiryTotal>100&&<p className="portal-empty-inline">Showing the latest 100 submissions. The protected Django admin provides the full history.</p>}
        </section>}

        <div className="portal-panel">
          <div className="portal-heading"><div><h2>Organization</h2><p>{overview.persona==="owner"?"Select an active organization to manage its work.":"Choose one of your assigned workspaces."}</p></div><span className="portal-pill">{overview.workspaces.length} available</span></div>
          {overview.workspaces.length?<div className="portal-workspace-row">
            <label>Workspace
              <select value={selected} onChange={e=>{setSelected(e.target.value);setNotice("");}}>
                {overview.workspaces.filter(w=>w.status==="active").map(w=><option value={w.id} key={w.id}>{w.name}</option>)}
              </select>
            </label>
            {workspace&&<div className="portal-workspace-meta"><b>{workspace.role}</b><small>Plan: {workspace.plan} · {workspace.status}</small></div>}
          </div>:<p className="portal-empty-inline">No workspaces are assigned. An administrator can create an organization and membership in the Django admin.</p>}
        </div>

        {workspace&&workspace.status==="active"&&<>
          <div className="portal-columns">
            <section className="portal-panel">
              <div className="portal-heading"><div><h2><BriefcaseBusiness size={19}/> Projects</h2><p>Real projects associated with this organization.</p></div></div>
              {!allowed("portal.projects.read")?<p className="portal-empty-inline">Your role does not include project viewing.</p>:
                loadingWorkspace?<p className="portal-empty-inline">Loading projects…</p>:
                projects.length?<ul className="portal-item-list">{projects.map(p=><li key={p.id}><b>{p.name}</b><small>{p.description||"No description yet"}</small><span className="portal-pill">{p.status.replaceAll("_"," ")}</span></li>)}</ul>:
                <p className="portal-empty-inline">No projects have been added for this organization.</p>}
              {allowed("portal.projects.manage")&&<form className="portal-inline-form" onSubmit={submitProject}>
                <h3><Plus size={16}/> New project</h3>
                <input required minLength={3} maxLength={180} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project name"/>
                <textarea maxLength={4000} rows={2} value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="Brief description"/>
                <button className="btn btn-primary" disabled={saving} type="submit">Create project <ArrowRight size={15}/></button>
              </form>}
            </section>

            <section className="portal-panel">
              <div className="portal-heading"><div><h2><LifeBuoy size={19}/> Support requests</h2><p>Track support messages for this workspace.</p></div></div>
              {!allowed("portal.tickets.read")?<p className="portal-empty-inline">Your role does not include support request viewing.</p>:
                loadingWorkspace?<p className="portal-empty-inline">Loading requests…</p>:
                tickets.length?<ul className="portal-item-list">{tickets.map(t=><li key={t.id}><b>{t.subject}</b><small>{t.message}</small>
                  {allowed("portal.tickets.manage")?<select value={t.status} aria-label={`Status for ${t.subject}`} onChange={e=>void updateTicket(t,e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>:<span className="portal-pill">{t.status.replaceAll("_"," ")}</span>}
                </li>)}</ul>:
                <p className="portal-empty-inline">No support requests yet.</p>}
              {allowed("portal.tickets.create")&&<form className="portal-inline-form" onSubmit={submitTicket}>
                <h3><Plus size={16}/> Request support</h3>
                <input required minLength={5} maxLength={180} value={ticketSubject} onChange={e=>setTicketSubject(e.target.value)} placeholder="Subject"/>
                <textarea required minLength={10} maxLength={4000} rows={3} value={ticketMessage} onChange={e=>setTicketMessage(e.target.value)} placeholder="Describe what you need…"/>
                <button className="btn btn-primary" type="submit" disabled={saving}>Send request <ArrowRight size={15}/></button>
              </form>}
            </section>
          </div>
        </>}
        <div className="portal-footnote"><KeyRound size={15}/> Your access is checked on the server for each request. For identity recovery or new memberships, contact the administrator.</div>
      </div>
    </div>
  </div></main>;
}
