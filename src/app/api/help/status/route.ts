import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/help/ai";
import { isDatabaseConfigured, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = isDatabaseConfigured();
  let schemaReady = false;

  if (database) {
    try {
      await query("SELECT 1 FROM help_conversations LIMIT 1");
      schemaReady = true;
    } catch {
      schemaReady = false;
    }
  }

  return NextResponse.json({
    database,
    schemaReady,
    aiConfigured: isAiConfigured()
  });
}
