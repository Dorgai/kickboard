import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import { normalizeTips } from "@/lib/onboarding-tips/defaults";
import {
  loadPublishedOnboardingTips,
  savePublishedOnboardingTips
} from "@/lib/onboarding-tips/store";
import type { OnboardingTip } from "@/lib/onboarding-tips/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const document = await loadPublishedOnboardingTips();
    return NextResponse.json({
      version: document.version,
      tips: document.tips,
      enabledCount: document.tips.filter((tip) => tip.enabled).length
    });
  } catch (error) {
    console.error("[admin/onboarding-tips]", error);
    return NextResponse.json({ error: "Unable to load tips." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { tips?: unknown };
    const tips = normalizeTips(body.tips);
    if (!tips.length) {
      return NextResponse.json({ error: "At least one tip is required." }, { status: 400 });
    }

    const saved = await savePublishedOnboardingTips(tips as OnboardingTip[]);
    return NextResponse.json({
      version: saved.version,
      tips: saved.tips,
      enabledCount: saved.tips.filter((tip) => tip.enabled).length,
      message: "Tips published."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save tips.";
    if (message === "DATABASE_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Tips publishing requires the database." },
        { status: 503 }
      );
    }
    console.error("[admin/onboarding-tips]", error);
    return NextResponse.json({ error: "Unable to save tips." }, { status: 500 });
  }
}
