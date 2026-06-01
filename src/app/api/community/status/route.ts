import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasJwt = Boolean(process.env.JWT_SECRET?.trim());

  return NextResponse.json({
    connected: isDatabaseConfigured() && hasJwt,
    database: isDatabaseConfigured(),
    jwt: hasJwt,
    message: !isDatabaseConfigured()
      ? "Attach Railway Postgres and run db/schema.sql plus db/community-extensions.sql."
      : !hasJwt
        ? "Set JWT_SECRET to enable community sessions."
        : "Community posting is available."
  });
}
