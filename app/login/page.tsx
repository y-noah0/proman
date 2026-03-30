"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setError("Invalid credentials.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="card w-full space-y-4 p-6">
        <div>
          <p className="section-title">PFDS</p>
          <h1 className="mt-2 text-2xl font-semibold">Workspace Login</h1>
          <p className="subtle mt-2 text-sm">
            Use your configured credentials to access project workspaces.
          </p>
        </div>

        <label className="block space-y-1 text-sm">
          <span>Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            required
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            required
          />
        </label>

        {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}

        <button
          disabled={busy}
          type="submit"
          className="w-full rounded-xl bg-[var(--accent-2)] px-4 py-2 font-medium text-white disabled:opacity-70"
        >
          {busy ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
