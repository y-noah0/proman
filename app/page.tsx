/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Project = {
  id: string;
  projectName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "Planning" | "Active" | "Completed";
  timeline: string;
  displayName: string;
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    projectName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Planning",
  });

  const load = useCallback(async () => {
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    if (!sessionRes.ok) {
      router.replace("/login");
      return;
    }

    const session = (await sessionRes.json()) as { username: string };
    setUsername(session.username);

    const projectsRes = await fetch("/api/pfds/projects", { cache: "no-store" });
    if (!projectsRes.ok) {
      setError("Failed to load projects.");
      setLoading(false);
      return;
    }

    const nextProjects = (await projectsRes.json()) as Project[];
    setProjects(nextProjects);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.projectName.trim()) {
      setError("Project Name is required.");
      return;
    }

    const response = await fetch("/api/pfds/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setError("Unable to create project.");
      return;
    }

    const created = (await response.json()) as Project;
    setProjects((current) => [created, ...current]);
    setForm({
      projectName: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "Planning",
    });
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return <main className="p-8">Loading PFDS workspace...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <section className="card fade-in mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-title">Product Feature Development System</p>
            <h1 className="mt-2 text-3xl font-semibold">Projects</h1>
            <p className="subtle mt-2 max-w-2xl text-sm">
              Every project gets its own dynamic workspace template with actors, capabilities,
              features, API contracts, architecture blueprint, and consolidation tracking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip">Signed in as {username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm hover:bg-white"
            >
              Logout
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={onCreateProject} className="card fade-in space-y-4 p-5">
          <h2 className="text-lg font-semibold">Create Project</h2>
          <label className="block space-y-1 text-sm">
            <span>Project Name</span>
            <input
              value={form.projectName}
              onChange={(event) => setForm((s) => ({ ...s, projectName: event.target.value }))}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((s) => ({ ...s, description: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Start Date</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((s) => ({ ...s, startDate: event.target.value }))}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>End Date</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((s) => ({ ...s, endDate: event.target.value }))}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((s) => ({ ...s, status: event.target.value as Project["status"] }))
              }
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-white hover:opacity-95"
          >
            Create Project Workspace
          </button>
        </form>

        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="card p-6">
              <p className="subtle text-sm">No projects yet. Create one to generate a full PFDS workspace.</p>
            </div>
          ) : (
            projects.map((project, index) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card fade-in block p-5 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      {project.status}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">{project.displayName}</h3>
                    <p className="subtle mt-2 text-sm">{project.description || "No description provided."}</p>
                  </div>
                  <span className="chip">Open Workspace</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
