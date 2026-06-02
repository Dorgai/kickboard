#!/usr/bin/env node
/**
 * Print a Postgres URL reachable from outside Railway (GitHub Actions, local laptop).
 * Prefers DATABASE_PUBLIC_URL on the Postgres plugin service.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "deploy/railway.project.json"), "utf8"));

const environment = process.env.RAILWAY_ENVIRONMENT?.trim() || config.environment || "production";
const projectId = process.env.RAILWAY_PROJECT_ID?.trim();
const postgresServiceNames = (
  process.env.RAILWAY_POSTGRES_SERVICE_NAME?.trim() ||
  "Postgres,PostgreSQL,postgres,postgresql"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

function railway(...args) {
  if (!process.env.RAILWAY_TOKEN?.trim()) {
    throw new Error("RAILWAY_TOKEN is not set.");
  }
  return execFileSync("railway", args, {
    encoding: "utf8",
    env: { ...process.env, RAILWAY_ENVIRONMENT: environment },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function isPrivateHost(url) {
  return /\.railway\.internal\b/i.test(url) || /postgres\.railway\.internal/i.test(url);
}

function pickDatabaseUrl(vars) {
  const entries = Object.entries(vars);
  const publicUrl = vars.DATABASE_PUBLIC_URL ?? vars.POSTGRES_PUBLIC_URL;
  if (publicUrl && !isPrivateHost(publicUrl)) {
    return publicUrl;
  }
  for (const [key, value] of entries) {
    if (!value || typeof value !== "string") continue;
    if (/PUBLIC/i.test(key) && /^postgres(ql)?:\/\//i.test(value) && !isPrivateHost(value)) {
      return value;
    }
  }
  const databaseUrl = vars.DATABASE_URL ?? vars.POSTGRES_URL;
  if (databaseUrl && !isPrivateHost(databaseUrl)) {
    return databaseUrl;
  }
  return null;
}

function parseVariableJson(raw) {
  const data = JSON.parse(raw);
  const vars = {};

  if (Array.isArray(data)) {
    for (const row of data) {
      const key = row.name ?? row.key ?? row.variable;
      const value = row.value ?? row.val;
      if (key && value !== undefined) vars[key] = value;
    }
    return vars;
  }

  if (data && typeof data === "object") {
    if (Array.isArray(data.variables)) {
      return parseVariableJson(data.variables);
    }
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") vars[key] = value;
    }
  }

  return vars;
}

function listServiceVariables(serviceName) {
  const args = ["variable", "list", "--service", serviceName, "--environment", environment, "--json"];
  if (projectId) {
    args.push("--project", projectId);
  }
  return parseVariableJson(railway(...args));
}

function listProjectServices() {
  if (!projectId) return [];
  const raw = railway("service", "list", "--project", projectId, "--environment", environment, "--json");
  const data = JSON.parse(raw);
  const rows = Array.isArray(data) ? data : (data.services ?? []);
  return rows.map((entry) => entry.node ?? entry).filter(Boolean);
}

function main() {
  const preset = process.env.DATABASE_URL?.trim();
  if (preset) {
    if (isPrivateHost(preset)) {
      console.error(
        "error: DATABASE_URL uses Railway private host (postgres.railway.internal). Use the public URL from Railway Postgres → Connect, or set GitHub secret DATABASE_URL to DATABASE_PUBLIC_URL."
      );
      process.exit(1);
    }
    process.stdout.write(preset);
    return;
  }

  const tried = [];

  for (const serviceName of postgresServiceNames) {
    tried.push(serviceName);
    try {
      const url = pickDatabaseUrl(listServiceVariables(serviceName));
      if (url) {
        process.stdout.write(url);
        return;
      }
    } catch {
      // try next service name
    }
  }

  if (projectId) {
    try {
      const services = listProjectServices();
      for (const service of services) {
        const name = service.name ?? "";
        if (!/postgres/i.test(name)) continue;
        if (tried.includes(name)) continue;
        tried.push(name);
        const url = pickDatabaseUrl(listServiceVariables(name));
        if (url) {
          process.stdout.write(url);
          return;
        }
      }
    } catch {
      // fall through to error message
    }
  }

  console.error(
    [
      "error: Could not resolve a public Postgres URL from Railway.",
      "",
      "Fix (pick one):",
      "  1. GitHub → repo Settings → Secrets → add DATABASE_URL = Postgres plugin → Connect → Public URL",
      "  2. Set RAILWAY_PROJECT_ID (kickboard project UUID) and re-run this workflow",
      "  3. Set RAILWAY_POSTGRES_SERVICE_NAME to your Postgres service name",
      "",
      `Tried service names: ${tried.join(", ") || "(none)"}`
    ].join("\n")
  );
  process.exit(1);
}

main();
