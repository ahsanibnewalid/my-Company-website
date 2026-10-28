"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, Building2, ClipboardList, KeyRound, LayoutDashboard,
  LockKeyhole, LogOut, Plus, ShieldCheck, UserPlus, Users,
} from "lucide-react";

type Tenant = { id: string; name: string; slug: string; status: string; plan_code: string };
type User = { id: string; email: string; name: string; is_active: boolean; is_superuser: boolean; mfa_required: boolean };
type Role = { code: string; name: string; tier: string };
type Membership = { id: string; email: string; tenant: string; role: string; is_active: boolean };
type AdminData = {
  summary: { tenants: number; users: number; projects: number; open_tickets: number; new_inquiries: number };
  tenants: Tenant[];
  users: User[];
  roles: Role[];
  memberships: Membership[];
};
type CreatedUser = { user: User; temporary_password: string };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json().catch(() => ({})) as T & { detail?: string };
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Administrator session expired.");
  }
  if (!response.ok) throw new Error(result.detail || "This operation could not be completed.");
  return result;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [provisioned, setProvisioned] = useState<CreatedUser | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberFirst, setMemberFirst] = useState("");
  const [memberLast, setMemberLast] = useState("");
  const [memberTenant, setMemberTenant] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [assignUser, setAssignUser] = useState("");
  const [assignTenant, setAssignTenant] = useState("");
  const [assignRole, setAssignRole] = useState("");

  const refresh = useCallback(async () => {
    try {
      const overview = await api<AdminData>("/api/admin/overview");
      setData(overview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load administration.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const activeTenants = useMemo(() => data?.tenants.filter(t => t.status === "active") || [], [data]);
  const assignableRoles = useMemo(() => data?.roles.filter(r => !r.tier.startsWith("executive") && r.tier !== "owner") || [], [data]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally { setSaving(false); }
  }

  function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAction(async () => {
      await api("/api/admin/tenants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, slug: orgSlug.toLowerCase() }),
      });
      setOrgName(""); setOrgSlug("");
    }, "Organization created in provisioning state. Activate it when ready.");
  }

  function changeTenant(tenant: Tenant, status: string) {
    void runAction(() => api("/api/admin/tenants/" + tenant.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }), "Organization status updated.");
  }

  function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProvisioned(null);
    void runAction(async () => {
      const result = await api<CreatedUser>("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: memberEmail, first_name: memberFirst, last_name: memberLast,
          tenant_id: memberTenant, role_code: memberRole,
        }),
      });
      setProvisioned(result);
      setMemberEmail(""); setMemberFirst(""); setMemberLast("");
    }, "Member created. Save the one-time password below before leaving this page.");
  }

  function changeUser(user: User) {
    void runAction(() => api("/api/admin/users/" + user.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    }), user.is_active ? "Account disabled." : "Account reactivated.");
  }

  function assignMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAction(() => api("/api/admin/memberships", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: assignUser, tenant_id: assignTenant, role_code: assignRole }),
    }), "Membership assigned. Any newly privileged account must enroll an authenticator.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/admin/login");
  }

  if (loading) return <main className="portal-shell"><p className="portal-loading">Verifying predefined administrator access…</p></main>;
  if (!data) return <main className="portal-shell"><div className="portal-empty">
    <h1>Administration restricted</h1>
    <p>{error || "An explicitly approved administrator account is required."}</p>
    <Link href="/admin/login">Administrator sign-in</Link>
    <p><Link href="/login">Staff and client login</Link></p>
  </div></main>;

  return <main className="portal-shell"><div className="portal-layout">
    <aside className="portal-sidebar">
      <Link className="auth-brand" href="/">✦ axiom<span>labs</span></Link>
      <div className="portal-side-label">RESTRICTED ADMINISTRATION</div>
      <div className="portal-side-active"><LayoutDashboard size={18}/> Owner control</div>
      <div className="portal-side-details"><span className="portal-avatar">A</span><div><b>Predefined administrator</b><small>MFA-protected company access</small></div></div>
      <Link className="portal-side-active" href="/portal"><ClipboardList size={16}/> Project operations</Link>
      <button className="portal-logout" onClick={logout}><LogOut size={16}/> Sign out</button>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><span><ShieldCheck size={17}/> Verified owner session</span>
        <span className="portal-pill"><LockKeyhole size={13}/> No public registration</span></header>
      <div className="portal-content">
        <div className="eyebrow">AXIOM LABS · COMPANY CONTROL</div>
        <h1>Administrator dashboard</h1>
        <p className="portal-lead">Manage organizations, accounts, access and operations. All changes are authorized by Django and recorded in the audit log.</p>
        {error && <div className="portal-notice portal-error" role="alert">{error}</div>}
        {notice && <div className="portal-notice" role="status">{notice}</div>}
        {provisioned && <div className="portal-notice admin-credential" role="status">
          <strong>One-time account credentials for {provisioned.user.email}</strong>
          <p>Temporary password: <code>{provisioned.temporary_password}</code></p>
          <p>Store and transfer it privately. It will not be shown again. Staff accounts need authenticator enrollment before they can log in.</p>
          <button type="button" className="btn btn-outline" onClick={() => setProvisioned(null)}>I saved it · hide password</button>
        </div>}
        <div className="portal-metrics admin-metrics">
          <div><Building2/><strong>{data.summary.tenants}</strong><span>Organizations</span></div>
          <div><Users/><strong>{data.summary.users}</strong><span>Accounts</span></div>
          <div><ClipboardList/><strong>{data.summary.projects}</strong><span>Projects</span></div>
          <div><KeyRound/><strong>{data.summary.new_inquiries}</strong><span>New inquiries</span></div>
        </div>
        <div className="admin-layout-grid">
          <section className="portal-panel">
            <div className="portal-heading"><div><h2><Building2 size={19}/> Organizations</h2><p>Provision and activate customer workspaces.</p></div></div>
            <ul className="portal-item-list">
              {data.tenants.map(tenant => <li key={tenant.id} className="admin-line">
                <div><b>{tenant.name}</b><small>{tenant.slug} · {tenant.plan_code}</small></div>
                <select aria-label={`Status for ${tenant.name}`} disabled={saving} value={tenant.status} onChange={event => changeTenant(tenant, event.target.value)}>
                  <option value="provisioning">Provisioning</option><option value="active">Active</option>
                  <option value="suspended">Suspended</option><option value="terminated">Terminated</option>
                </select>
              </li>)}
            </ul>
            {!data.tenants.length && <p className="portal-empty-inline">No organizations yet.</p>}
            <form className="portal-inline-form" onSubmit={createTenant}>
              <h3><Plus size={16}/> Create organization</h3>
              <label>Organization name<input required minLength={2} maxLength={180} value={orgName} onChange={e => setOrgName(e.target.value)}/></label>
              <label>Unique slug<input required minLength={2} maxLength={80} pattern="[a-zA-Z0-9_-]+" placeholder="northstar" value={orgSlug} onChange={e => setOrgSlug(e.target.value)}/></label>
              <button className="btn btn-primary" disabled={saving} type="submit">Create workspace <ArrowRight size={15}/></button>
            </form>
          </section>
          <section className="portal-panel">
            <div className="portal-heading"><div><h2><Users size={19}/> People & access</h2><p>Only the predefined owner can create and disable accounts.</p></div></div>
            <ul className="portal-item-list">
              {data.users.map(user => <li key={user.id} className="admin-line">
                <div><b>{user.name}</b><small>{user.email} · {user.is_superuser?"Owner":user.mfa_required?"MFA required":"Member"}</small></div>
                <button className="btn btn-outline" type="button" disabled={saving || user.is_superuser} onClick={() => changeUser(user)}>
                  {user.is_active ? "Disable" : "Enable"}
                </button>
              </li>)}
            </ul>
            {!data.users.length && <p className="portal-empty-inline">No accounts yet.</p>}
            <form className="portal-inline-form" onSubmit={createMember}>
              <h3><UserPlus size={16}/> Provision staff or client</h3>
              <label>Work email<input required type="email" maxLength={254} value={memberEmail} onChange={e=>setMemberEmail(e.target.value)}/></label>
              <div className="admin-form-row">
                <label>First name<input maxLength={150} value={memberFirst} onChange={e=>setMemberFirst(e.target.value)}/></label>
                <label>Last name<input maxLength={150} value={memberLast} onChange={e=>setMemberLast(e.target.value)}/></label>
              </div>
              <label>Active organization<select required value={memberTenant} onChange={e=>setMemberTenant(e.target.value)}>
                <option value="">Select organization</option>{activeTenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
              <label>Member role<select required value={memberRole} onChange={e=>setMemberRole(e.target.value)}>
                <option value="">Select role</option>{assignableRoles.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}
              </select></label>
              <button className="btn btn-primary" disabled={saving || !activeTenants.length || !assignableRoles.length} type="submit">Create account <ArrowRight size={15}/></button>
            </form>
          </section>
        </div>
        <section className="portal-panel">
          <div className="portal-heading"><div><h2><KeyRound size={19}/> Memberships</h2><p>Assign an existing non-owner user to another active organization.</p></div></div>
          <ul className="portal-item-list admin-memberships">{data.memberships.map(m=><li key={m.id}><b>{m.email}</b><small>{m.tenant} · {m.role} · {m.is_active?"Active":"Inactive"}</small></li>)}</ul>
          <form className="portal-inline-form admin-assignment" onSubmit={assignMembership}>
            <label>Account<select required value={assignUser} onChange={e=>setAssignUser(e.target.value)}>
              <option value="">Select account</option>{data.users.filter(u=>u.is_active&&!u.is_superuser).map(u=><option key={u.id} value={u.id}>{u.email}</option>)}
            </select></label>
            <label>Organization<select required value={assignTenant} onChange={e=>setAssignTenant(e.target.value)}>
              <option value="">Select organization</option>{activeTenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select></label>
            <label>Role<select required value={assignRole} onChange={e=>setAssignRole(e.target.value)}>
              <option value="">Select role</option>{assignableRoles.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}
            </select></label>
            <button className="btn btn-primary" disabled={saving} type="submit">Assign membership</button>
          </form>
        </section>
        <section className="portal-panel admin-operations">
          <div><h2><ClipboardList size={19}/> Projects, tickets & applications</h2>
          <p>Review project inquiries, career applications, tenant projects and support tickets in the authenticated operations portal.</p></div>
          <Link className="btn btn-primary" href="/portal">Open operations <ArrowRight size={15}/></Link>
        </section>
        <div className="portal-footnote"><ShieldCheck size={15}/> Administrator approval, password verification, MFA and server-side permissions are required for all management actions. To recover administrator access, use the private backend management process.</div>
      </div>
    </div>
  </div></main>;
}
