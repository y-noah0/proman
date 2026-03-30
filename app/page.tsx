/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  LoadingSpinner,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
} from "./components/ui";
import { showToast } from "@/lib/toast";
import { formatDate, getStatusColor } from "@/lib/ui-utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Project["status"]>(
    "All",
  );
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<{
    projectName: string;
    description: string;
    startDate: string;
    endDate: string;
    status: Project["status"];
  }>({
    projectName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Planning",
  });

  const load = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      if (!sessionRes.ok) {
        router.replace("/login");
        return;
      }

      const session = (await sessionRes.json()) as { username: string };
      setUsername(session.username);

      const projectsRes = await fetch("/api/pfds/projects", {
        cache: "no-store",
      });
      if (!projectsRes.ok) {
        setError("Failed to load projects.");
        return;
      }

      const nextProjects = (await projectsRes.json()) as Project[];
      setProjects(nextProjects);
      setError("");
    } catch (err) {
      setError("An error occurred while loading projects.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.projectName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  async function onCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.projectName.trim()) {
      setError("Project Name is required.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/pfds/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Unable to create project.");
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
      setShowForm(false);
      showToast(
        `Project "${created.projectName}" created successfully!`,
        "success",
      );
    } catch (err) {
      setError("Unable to create project. Please try again.");
      console.error(err);
      showToast("Failed to create project", "error");
    } finally {
      setCreating(false);
    }
  }

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      showToast("Logout failed", "error");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <LoadingSpinner label="Loading your PFDS workspace..." />
      </main>
    );
  }

  const stats = {
    total: projects.length,
    planning: projects.filter((p) => p.status === "Planning").length,
    active: projects.filter((p) => p.status === "Active").length,
    completed: projects.filter((p) => p.status === "Completed").length,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8">
      <section className="card fade-in mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-title">Product Feature Development System</p>
            <h1 className="mt-2 text-3xl font-semibold">Projects</h1>
            <p className="subtle mt-2 max-w-2xl text-sm">
              Every project gets its own dynamic workspace template with actors,
              capabilities, features, API contracts, architecture blueprint, and
              consolidation tracking.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
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

      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
        />
      )}

      {/* Stats Row */}
      {stats.total > 0 && (
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          <div className="card rounded-lg border border-[var(--line)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent-2)]">
              {stats.total}
            </div>
            <div className="subtle text-sm">Total Projects</div>
          </div>
          <div className="card rounded-lg border border-[var(--line)] p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.planning}</div>
            <div className="subtle text-sm">Planning</div>
          </div>
          <div className="card rounded-lg border border-[var(--line)] p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="subtle text-sm">Active</div>
          </div>
          <div className="card rounded-lg border border-[var(--line)] p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stats.completed}
            </div>
            <div className="subtle text-sm">Completed</div>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Create Form */}
        <form
          onSubmit={onCreateProject}
          className="card fade-in space-y-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Project</h2>
            {showForm && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="text-sm text-[var(--text-secondary)] hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          {showForm ? (
            <>
              <label className="block space-y-1 text-sm">
                <span>Project Name</span>
                <input
                  value={form.projectName}
                  onChange={(event) =>
                    setForm((s) => ({
                      ...s,
                      projectName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  placeholder="Enter project name"
                  required
                  autoFocus
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((s) => ({
                      ...s,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  placeholder="Project description (optional)"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((s) => ({
                        ...s,
                        startDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>End Date</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((s) => ({
                        ...s,
                        endDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  />
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((s) => ({
                      ...s,
                      status: event.target.value as Project["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-[var(--accent-2)] px-4 py-2 font-medium text-white hover:opacity-95 disabled:opacity-70"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl border-2 border-dashed border-[var(--line)] px-4 py-3 font-medium text-[var(--text-secondary)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]"
            >
              + New Project
            </button>
          )}
        </form>

        {/* Projects List */}
        <div className="space-y-4">
          {/* Search and Filter */}
          {projects.length > 0 && (
            <div className="card fade-in space-y-3 p-4">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {(["All", "Planning", "Active", "Completed"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? "bg-[var(--accent-2)] text-white"
                          : "border border-[var(--line)] bg-white hover:bg-gray-50"
                      }`}
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="card p-8">
              <EmptyState
                title={
                  projects.length === 0
                    ? "No projects yet"
                    : "No projects match your search"
                }
                description={
                  projects.length === 0
                    ? "Create one to generate a full PFDS workspace."
                    : "Try adjusting your search filters."
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="card fade-in group block p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  style={{
                    animationDelay: `${Math.min(index * 40, 280)}ms`,
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold group-hover:text-[var(--accent-2)]">
                        {project.displayName}
                      </h3>
                      {project.description && (
                        <p className="subtle mt-1 text-sm">
                          {project.description}
                        </p>
                      )}
                      {(project.startDate || project.endDate) && (
                        <div className="subtle mt-2 flex gap-4 text-xs">
                          {project.startDate && (
                            <span>
                              Start:{" "}
                              {formatDate(project.startDate)}
                            </span>
                          )}
                          {project.endDate && (
                            <span>
                              End: {formatDate(project.endDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="chip">Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
