"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

type Project = { id: string; title: string; description: string; status: string; url: string };

export default function ProjectShowcase() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/projects", { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((data: { projects?: Project[] }) => setProjects(data.projects || []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!projects.length) return null;
  return <section id="work" className="section wrap"><div className="section-head"><div>
    <div className="eyebrow">SELECTED WORK</div><h2>Projects in <span className="gradient-text">focus.</span></h2>
  </div><p>A few of the projects and ideas we are building.</p></div>
    <div className="feature-grid">{projects.map(project => <article className="feature-card" key={project.id}>
      <span className="card-kicker">{project.status.toUpperCase()}</span><h3>{project.title}</h3>
      <p>{project.description}</p>
      {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-link">Explore project <ArrowUpRight size={16}/></a>}
    </article>)}</div>
  </section>;
}
