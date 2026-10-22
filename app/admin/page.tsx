"use client";

/**
 * Owner / admin console UI.
 * Demo-only data lives in browser memory. Replace with authenticated server actions/API,
 * tenant-scoped database queries, and audited permission checks before production use.
 */
import { useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, Building2, Check, ChevronDown,
  CircleDollarSign, ClipboardCheck, CreditCard, Download, FileText, Filter,
  Gauge, KeyRound, LockKeyhole, LogOut, Menu, Plus, Search, Settings, Shield,
  ShieldCheck, Users, UserCog, X, AlertTriangle, CheckCircle2, Clock3, Eye,
  LifeBuoy, Mail, MoreHorizontal, RefreshCw, Server, SlidersHorizontal,
} from "lucide-react";

type Tenant = { name: string; owner: string; plan: string; status: "Active" | "Trial" | "Past due"; users: number; mrr: number };
type Lead = { name: string; company: string; email: string; interest: string; status: "New" | "Contacted" | "Qualified" };
const initialTenants: Tenant[] = [
  { name: "Northstar Studio", owner: "Maya Rahman", plan: "Growth", status: "Active", users: 18, mrr: 149 },
  { name: "Orbit Systems", owner: "Tanvir Ahmed", plan: "Enterprise", status: "Active", users: 42, mrr: 499 },
  { name: "Pixel & Co.", owner: "Nadia Islam", plan: "Starter", status: "Trial", users: 4, mrr: 0 },
  { name: "Delta Works", owner: "Rafi Chowdhury", plan: "Growth", status: "Past due", users: 12, mrr: 149 },
];
const initialLeads: Lead[] = [
  { name: "Samira Khan", company: "BrightPath Education", email: "samira@example.com", interest: "Custom SaaS", status: "New" },
  { name: "Arif Hasan", company: "CloudLedger", email: "arif@example.com", interest: "Cloud & DevOps", status: "Contacted" },
  { name: "Nusrat Jahan", company: "HealthBridge", email: "nusrat@example.com", interest: "AI integration", status: "Qualified" },
];
const nav = [
  { label: "Overview", icon: Gauge }, { label: "Organizations", icon: Building2 },
  { label: "Team & access", icon: UserCog }, { label: "Billing", icon: CreditCard },
  { label: "Leads & requests", icon: ClipboardCheck }, { label: "Security & audit", icon: ShieldCheck },
  { label: "Support", icon: LifeBuoy }, { label: "Settings", icon: Settings },
];
const audit = [
  { action: "Privileged sign-in policy reviewed", actor: "System policy", time: "Today · 09:42", type: "Security" },
  { action: "Organization invitation created", actor: "Workspace admin", time: "Today · 08:17", type: "Access" },
  { action: "Dependency scan completed", actor: "CI automation", time: "Yesterday · 18:35", type: "Engineering" },
  { action: "Invoice status synchronized", actor: "Billing service", time: "Yesterday · 16:10", type: "Billing" },
];

function statusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

export default function AdminConsole() {
  const [section, setSection] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [tenants, setTenants] = useState(initialTenants);
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newOrg, setNewOrg] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [filter, setFilter] = useState("All");
  const [mfa, setMfa] = useState(true);
  const [approval, setApproval] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Support");
  const [inviteList, setInviteList] = useState<{ email: string; role: string }[]>([
    { email: "admin@example.com", role: "Owner" },
    { email: "engineering@example.com", role: "Developer" },
    { email: "faculty@example.com", role: "Reviewer" },
  ]);

  const filteredTenants = useMemo(() => tenants.filter(t =>
    (filter === "All" || t.status === filter) &&
    `${t.name} ${t.owner} ${t.plan} ${t.status}`.toLowerCase().includes(search.toLowerCase())
  ), [tenants, filter, search]);
  const mrr = tenants.reduce((sum, tenant) => sum + tenant.mrr, 0);

  function exportTenants() {
    const rows = [["Organization", "Owner", "Plan", "Status", "Users", "Monthly recurring revenue (USD)"],
      ...filteredTenants.map(t => [t.name, t.owner, t.plan, t.status, String(t.users), String(t.mrr)])];
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "organization-report-demo.csv"; anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Demo organization report exported.");
  }

  function addOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newOrg.trim() || !newOwner.trim() || !newEmail.includes("@")) return;
    setTenants(current => [...current, { name: newOrg.trim(), owner: newOwner.trim(), plan: "Starter", status: "Trial", users: 1, mrr: 0 }]);
    setNotice(`Demo organization “${newOrg.trim()}” added locally. No invitation was sent.`);
    setNewOrg(""); setNewOwner(""); setNewEmail(""); setShowAdd(false);
  }

  function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteEmail.includes("@")) return;
    setInviteList(current => [...current, { email: inviteEmail.trim(), role: inviteRole }]);
    setNotice("Demo team entry added locally. No email was sent and no access was granted.");
    setInviteEmail("");
  }

  function changeLead(index: number, status: Lead["status"]) {
    setLeads(current => current.map((lead, i) => i === index ? { ...lead, status } : lead));
    setNotice("Lead status updated in this demo session.");
  }

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${mobileNav ? "admin-sidebar-open" : ""}`}>
        <a className="admin-brand" href="/"><span className="admin-brand-mark"><ShieldCheck size={21}/></span><span><b>axiom<span>labs</span></b><small>OWNER CONSOLE</small></span></a>
        <div className="admin-workspace"><span className="workspace-avatar">A</span><span><b>Axiom Labs</b><small>Owner workspace</small></span><ChevronDown size={15}/></div>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav">{nav.map(item => <button key={item.label} className={section === item.label ? "active" : ""} onClick={() => { setSection(item.label); setMobileNav(false); }}><item.icon size={17}/><span>{item.label}</span>{item.label === "Leads & requests" && <i>3</i>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-help"><LifeBuoy size={18}/><b>Need a hand?</b><p>Keep support channels and incident ownership documented.</p><button onClick={() => {setSection("Support");setMobileNav(false);}}>Open support center <ArrowUpRight size={13}/></button></div><div className="sidebar-profile"><span className="profile-avatar">AS</span><span><b>Ahsan Ibne Walid Shuvo</b><small>Founder & Managing Director</small></span><MoreHorizontal size={17}/></div></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><button className="admin-mobile-toggle" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button><div className="admin-breadcrumb">Axiom Labs <span>/</span> <b>{section}</b></div><div className="admin-top-actions"><span className="demo-chip"><span/> DEMO DATA</span><button className="admin-top-icon" aria-label="Notifications" onClick={() => setNotice("You are viewing sample notifications; no live alerts are connected.")}><Bell size={18}/></button><a className="view-site-link" href="/">View website <ArrowUpRight size={14}/></a></div></header>
        <div className="admin-content">
          {notice && <div className="admin-notice" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16}/></button></div>}
          {section === "Overview" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">MONDAY · OWNER OVERVIEW</div><h1>Good afternoon, Ahsan.</h1><p>Here’s the operational snapshot of your company workspace.</p></div><button className="admin-button admin-button-primary" onClick={() => {setSection("Organizations");setShowAdd(true);}}><Plus size={16}/> Add organization</button></div>
            <div className="admin-banner"><div className="banner-orb"><Shield size={27}/></div><div><b>Your command center, at a glance.</b><p>Monitor customers, commercial health, access governance, and delivery signals from one place.</p></div><span className="banner-tag"><Activity size={14}/> SYSTEMS OVERVIEW</span></div>
            <div className="admin-stat-grid"><article className="admin-stat"><div><span>Organizations</span><Building2 size={18}/></div><strong>{tenants.length.toString().padStart(2, "0")}</strong><small><span className="stat-neutral">Demo workspace</span> · all sample records</small></article><article className="admin-stat"><div><span>Monthly recurring revenue</span><CircleDollarSign size={18}/></div><strong>${mrr.toLocaleString()}</strong><small>Illustrative USD amounts · not actual revenue</small></article><article className="admin-stat"><div><span>Active seats</span><Users size={18}/></div><strong>{tenants.reduce((sum, t) => sum + t.users, 0)}</strong><small>Across sample organizations</small></article><article className="admin-stat"><div><span>Items needing attention</span><AlertTriangle size={18}/></div><strong>{tenants.filter(t => t.status === "Past due").length + leads.filter(l => l.status === "New").length}</strong><small>Sample past-due billing and new leads</small></article></div>
            <div className="admin-two-col"><article className="admin-panel"><div className="admin-panel-head"><div><h2>Organizations</h2><p>Customer workspaces and their current status.</p></div><button className="admin-text-button" onClick={() => setSection("Organizations")}>View all <ArrowUpRight size={14}/></button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Organization</th><th>Plan</th><th>Status</th></tr></thead><tbody>{tenants.slice(0,4).map(t=><tr key={t.name}><td><span className="org-table-name"><span className="org-table-avatar">{t.name.slice(0,1)}</span><span><b>{t.name}</b><small>{t.owner}</small></span></span></td><td>{t.plan}</td><td><span className={`admin-status ${statusClass(t.status)}`}>{t.status}</span></td></tr>)}</tbody></table></div></article>
              <article className="admin-panel"><div className="admin-panel-head"><div><h2>Security activity</h2><p>Recent illustrative audit events.</p></div><button className="admin-icon-button" aria-label="View security audit" onClick={() => setSection("Security & audit")}><ArrowUpRight size={16}/></button></div><div className="admin-activity-list">{audit.slice(0,3).map((event,i)=><div className="admin-activity" key={event.action}><span className={`activity-symbol activity-${i}`}>{i===0?<LockKeyhole size={15}/>:i===1?<Users size={15}/>:<ShieldCheck size={15}/>}</span><span><b>{event.action}</b><small>{event.actor} · {event.time}</small></span></div>)}</div><div className="admin-panel-foot"><span className="admin-green-dot"/> Demo audit events only — no production log connected.</div></article></div>
            <article className="admin-panel admin-quick-panel"><div className="admin-panel-head"><div><h2>Owner shortcuts</h2><p>Common operational tasks.</p></div></div><div className="admin-shortcuts"><button onClick={() => setSection("Team & access")}><UserCog/><b>Manage team access</b><small>Review role assignments</small><ArrowUpRight/></button><button onClick={() => setSection("Billing")}><CreditCard/><b>Review billing</b><small>Inspect sample subscriptions</small><ArrowUpRight/></button><button onClick={() => setSection("Security & audit")}><ShieldCheck/><b>Security controls</b><small>Policies and audit history</small><ArrowUpRight/></button><button onClick={() => setSection("Leads & requests")}><ClipboardCheck/><b>Review inbound leads</b><small>Track customer requests</small><ArrowUpRight/></button></div></article>
          </>}

          {section === "Organizations" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">CUSTOMER LIFECYCLE</div><h1>Organizations</h1><p>Review tenant workspaces, ownership, plans and account status.</p></div><button className="admin-button admin-button-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={16}/> Add organization</button></div>
            {showAdd && <form className="admin-panel admin-inline-form" onSubmit={addOrganization}><div className="admin-panel-head"><div><h2>Create demo organization</h2><p>This only adds a local sample row; it does not provision a tenant.</p></div><button type="button" className="admin-icon-button" onClick={() => setShowAdd(false)}><X size={16}/></button></div><div className="admin-form-grid"><label>Organization name<input required value={newOrg} onChange={e=>setNewOrg(e.target.value)} placeholder="Company Ltd."/></label><label>Primary contact<input required value={newOwner} onChange={e=>setNewOwner(e.target.value)} placeholder="Contact name"/></label><label>Contact email<input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="owner@company.com"/></label></div><button className="admin-button admin-button-primary" type="submit"><Plus size={15}/> Add demo row</button></form>}
            <div className="admin-filter-row"><label className="admin-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search organizations…"/></label><label className="admin-select"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Trial</option><option>Past due</option></select></label><button className="admin-button admin-button-secondary" onClick={exportTenants}><Download size={15}/> Export CSV</button></div>
            <div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table admin-full-table"><thead><tr><th>Organization / owner</th><th>Plan</th><th>Seats</th><th>MRR (demo USD)</th><th>Status</th></tr></thead><tbody>{filteredTenants.map(t=><tr key={t.name}><td><span className="org-table-name"><span className="org-table-avatar">{t.name.slice(0,1)}</span><span><b>{t.name}</b><small>{t.owner}</small></span></span></td><td>{t.plan}</td><td>{t.users}</td><td>${t.mrr.toLocaleString()}</td><td><span className={`admin-status ${statusClass(t.status)}`}>{t.status}</span></td></tr>)}</tbody></table>{filteredTenants.length===0&&<div className="admin-empty">No organizations match these filters.</div>}</div><div className="admin-panel-foot"><LockKeyhole size={14}/> In production, tenant records must be queried server-side and scoped by authenticated authorization.</div></div>
          </>}

          {section === "Team & access" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">IDENTITY GOVERNANCE</div><h1>Team & access</h1><p>Plan least-privilege roles, approvals and account lifecycle controls.</p></div></div>
            <div className="admin-callout"><ShieldCheck size={20}/><div><b>Owner access is a protected privilege.</b><p>Use named accounts, MFA, least privilege, independent review and auditable offboarding. Do not share owner credentials with interns or contractors.</p></div></div>
            <form className="admin-panel admin-inline-form" onSubmit={inviteMember}><div className="admin-panel-head"><div><h2>Team directory (demo)</h2><p>Adding a row here does not create a user or send an invitation.</p></div></div><div className="admin-form-grid"><label>Work email<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@company.com"/></label><label>Proposed role<select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>{["Owner","Administrator","Reviewer","Developer","Finance","Support","Read-only"].map(r=><option key={r}>{r}</option>)}</select></label><div className="admin-form-submit"><button className="admin-button admin-button-primary" type="submit"><Plus size={15}/> Add demo entry</button></div></div><div className="admin-team-list">{inviteList.map((member,i)=><div className="admin-team-row" key={member.email}><span className="org-table-avatar">{member.email.slice(0,1).toUpperCase()}</span><span><b>{member.email}</b><small>{i===0?"Founder workspace": "Proposed team member"}</small></span><span className="admin-role-chip">{member.role}</span><button type="button" className="admin-icon-button" aria-label={`Remove ${member.email} from demo list`} onClick={()=>setInviteList(current=>current.filter((_,index)=>index!==i))}><X size={15}/></button></div>)}</div></form>
            <div className="admin-stat-grid admin-stat-grid-three"><article className="admin-stat"><div><span>Role model</span><KeyRound size={18}/></div><strong>RBAC</strong><small>Server-side checks required for every sensitive action.</small></article><article className="admin-stat"><div><span>Privileged access</span><LockKeyhole size={18}/></div><strong>MFA</strong><small>Require strong MFA for owners and administrators.</small></article><article className="admin-stat"><div><span>Offboarding</span><Users size={18}/></div><strong>Revoke</strong><small>Disable sessions, tokens and access promptly.</small></article></div>
          </>}

          {section === "Billing" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">REVENUE OPERATIONS</div><h1>Billing & subscriptions</h1><p>Sample billing overview for planning customer lifecycle workflows.</p></div><span className="demo-chip"><span/> ILLUSTRATIVE DATA</span></div>
            <div className="admin-callout admin-callout-amber"><AlertTriangle size={20}/><div><b>No payment provider is connected.</b><p>Amounts are sample USD values. Do not use this console to collect payments, issue legal invoices or change a live subscription.</p></div></div>
            <div className="admin-stat-grid"><article className="admin-stat"><div><span>Illustrative MRR</span><CircleDollarSign size={18}/></div><strong>${mrr.toLocaleString()}</strong><small>USD · derived from local sample data</small></article><article className="admin-stat"><div><span>Active subscriptions</span><CheckCircle2 size={18}/></div><strong>{tenants.filter(t=>t.status==="Active").length}</strong><small>Sample active accounts</small></article><article className="admin-stat"><div><span>Trial accounts</span><Clock3 size={18}/></div><strong>{tenants.filter(t=>t.status==="Trial").length}</strong><small>Sample trial accounts</small></article><article className="admin-stat"><div><span>Past due</span><AlertTriangle size={18}/></div><strong>{tenants.filter(t=>t.status==="Past due").length}</strong><small>Needs a real dunning workflow</small></article></div>
            <div className="admin-panel"><div className="admin-panel-head"><div><h2>Subscription ledger (demo)</h2><p>Never treat frontend status as proof of payment.</p></div><FileText size={18}/></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Plan</th><th>Monthly amount</th><th>Next step</th><th>Status</th></tr></thead><tbody>{tenants.map(t=><tr key={t.name}><td><b>{t.name}</b></td><td>{t.plan}</td><td>${t.mrr.toLocaleString()} USD</td><td>{t.status==="Past due"?"Reconcile provider event":t.status==="Trial"?"Trial conversion": "Routine reconciliation"}</td><td><span className={`admin-status ${statusClass(t.status)}`}>{t.status}</span></td></tr>)}</tbody></table></div><div className="admin-panel-foot"><LockKeyhole size={14}/> Production billing needs signed webhooks, idempotency, immutable invoice numbers, and reconciliation.</div></div>
          </>}

          {section === "Leads & requests" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">CUSTOMER RELATIONSHIPS</div><h1>Leads & requests</h1><p>Track demo inquiries and decide the next human follow-up.</p></div><span className="admin-status new">{leads.filter(l=>l.status==="New").length} new</span></div>
            <div className="admin-panel"><div className="admin-panel-head"><div><h2>Inbound lead queue</h2><p>Fictional sample contacts; no email or CRM integration is connected.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contact</th><th>Organization</th><th>Interest</th><th>Status</th><th>Update status</th></tr></thead><tbody>{leads.map((lead,i)=><tr key={lead.email}><td><span className="admin-contact"><b>{lead.name}</b><small>{lead.email}</small></span></td><td>{lead.company}</td><td>{lead.interest}</td><td><span className={`admin-status ${statusClass(lead.status)}`}>{lead.status}</span></td><td><select className="admin-row-select" aria-label={`Status for ${lead.name}`} value={lead.status} onChange={e=>changeLead(i,e.target.value as Lead["status"])}><option>New</option><option>Contacted</option><option>Qualified</option></select></td></tr>)}</tbody></table></div></div>
            <div className="admin-callout"><Mail size={20}/><div><b>Recommended lead workflow</b><p>Capture consent, assign an accountable owner, log contact history, define retention, and use a verified mail provider for outbound communications.</p></div></div>
          </>}

          {section === "Security & audit" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">TRUST & CONTROL</div><h1>Security & audit</h1><p>Operational guardrails for protecting customer data and production access.</p></div><span className="admin-status active"><ShieldCheck size={13}/> POLICY PREVIEW</span></div>
            <div className="admin-callout"><LockKeyhole size={20}/><div><b>Founder-controlled production access</b><p>Keep hosting credentials and signing keys in a managed secret store, enforce protected branches, require reviews, and audit every privileged change. Never expose secrets in the browser.</p></div></div>
            <div className="admin-panel"><div className="admin-panel-head"><div><h2>Policy controls (UI preview)</h2><p>These switches only change this page's local demo state.</p></div><SlidersHorizontal size={18}/></div><div className="admin-settings-list"><label><span className="settings-icon"><KeyRound size={17}/></span><span><b>Multi-factor authentication</b><small>Require MFA for owner and administrator accounts.</small></span><input type="checkbox" checked={mfa} onChange={e=>{setMfa(e.target.checked);setNotice("MFA preview setting changed locally; real authentication policy is unchanged.");}}/></label><label><span className="settings-icon"><ClipboardCheck size={17}/></span><span><b>Required review approval</b><small>Require authorized review before protected branch merges.</small></span><input type="checkbox" checked={approval} onChange={e=>{setApproval(e.target.checked);setNotice("Review approval preview changed locally; GitHub branch protection is unchanged.");}}/></label><label><span className="settings-icon"><Bell size={17}/></span><span><b>Security notifications</b><small>Send alerts for privileged actions and unusual activity.</small></span><input type="checkbox" checked={alerts} onChange={e=>{setAlerts(e.target.checked);setNotice("Notification preview changed locally; no alerts are configured.");}}/></label><label><span className="settings-icon"><Server size={17}/></span><span><b>Maintenance banner</b><small>Preview maintenance-mode state for the dashboard.</small></span><input type="checkbox" checked={maintenance} onChange={e=>{setMaintenance(e.target.checked);setNotice("Maintenance banner preview changed locally; production traffic is unaffected.");}}/></label></div></div>
            <div className="admin-panel"><div className="admin-panel-head"><div><h2>Recent audit trail</h2><p>Sample entries to demonstrate the audit interface.</p></div><button className="admin-button admin-button-secondary" onClick={()=>setNotice("Audit refresh is a UI demo; no audit backend is connected.")}><RefreshCw size={14}/> Refresh</button></div><div className="admin-audit-list">{audit.map((event,i)=><div className="admin-audit-row" key={event.action}><span className="audit-type-icon"><Activity size={16}/></span><span><b>{event.action}</b><small>{event.actor}</small></span><span className="admin-audit-category">{event.type}</span><time>{event.time}</time></div>)}</div><div className="admin-panel-foot"><AlertTriangle size={14}/> Real audit logs must be append-only, server-generated, access-controlled and retained under a documented policy.</div></div>
          </>}

          {section === "Support" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">OPERATIONS & CONTINUITY</div><h1>Support center</h1><p>Make incident ownership, customer communication and recovery predictable.</p></div></div>
            <div className="admin-support-grid"><article className="admin-panel"><LifeBuoy size={22}/><h2>Customer support</h2><p>Define a support mailbox, ticket owner, severity, response targets and escalation route for every customer.</p><button className="admin-button admin-button-secondary" onClick={()=>setNotice("Support workflow checklist opened in demo mode.")}>Review workflow <ArrowUpRight size={14}/></button></article><article className="admin-panel"><Activity size={22}/><h2>Incident response</h2><p>Maintain incident runbooks, status updates, evidence handling, postmortems and named incident commanders.</p><button className="admin-button admin-button-secondary" onClick={()=>setNotice("Incident checklist opened in demo mode.")}>Review checklist <ArrowUpRight size={14}/></button></article><article className="admin-panel"><Server size={22}/><h2>Backup & recovery</h2><p>Document recovery objectives, encrypt backups, restrict restore privileges and test restoration on a schedule.</p><button className="admin-button admin-button-secondary" onClick={()=>setNotice("Recovery checklist opened in demo mode.")}>Review recovery plan <ArrowUpRight size={14}/></button></article><article className="admin-panel"><Eye size={22}/><h2>Observability</h2><p>Track uptime, error rates, queue failures, payment reconciliation and security alerts from trusted telemetry.</p><button className="admin-button admin-button-secondary" onClick={()=>setNotice("Monitoring checklist opened in demo mode.")}>Review monitoring <ArrowUpRight size={14}/></button></article></div>
          </>}

          {section === "Settings" && <>
            <div className="admin-page-heading"><div><div className="admin-eyebrow">WORKSPACE CONFIGURATION</div><h1>Settings</h1><p>Document the business and operational defaults your real platform will enforce.</p></div></div>
            <div className="admin-panel admin-inline-form"><div className="admin-panel-head"><div><h2>Company profile</h2><p>Displayed values are illustrative and are not submitted to a server.</p></div><Settings size={18}/></div><div className="admin-form-grid"><label>Company name<input defaultValue="Axiom Labs"/></label><label>Founder / Managing Director<input defaultValue="Ahsan Ibne Walid Shuvo"/></label><label>Default currency<select defaultValue="BDT"><option>BDT</option><option>USD</option><option>EUR</option></select></label><label>Tax jurisdiction<input defaultValue="Circle 006, Bangladesh — verify before publishing"/></label></div><button className="admin-button admin-button-primary" onClick={()=>setNotice("Profile fields are a UI preview only; no company settings were saved.")}>Save preview <Check size={15}/></button></div>
            <div className="admin-panel"><div className="admin-panel-head"><div><h2>Production readiness checklist</h2><p>Complete and verify these before onboarding paying customers.</p></div></div><div className="admin-checklist">{["Server-side authentication and secure session lifecycle","Tenant-scoped database authorization with isolation tests","RBAC matrix and object-level permission tests","Payment provider, signed webhooks and reconciliation","Immutable audit events and security alert delivery","Backups, restore drills, monitoring and incident runbooks","Privacy notice, retention schedule and consent flows","Protected main branch, CI checks and release approvals"].map(item=><div key={item}><span className="check-empty"/><span>{item}</span><span className="admin-status trial">Not verified</span></div>)}</div></div>
          </>}
          <footer className="admin-footer"><span>© {new Date().getFullYear()} Axiom Labs · Owner console prototype</span><span><span className="admin-green-dot"/> Local demo state · no live services connected</span></footer>
        </div>
      </section>
    </main>
  );
}
