import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { filterOnboardingTipsForUser } from "@/lib/onboarding-tips/features";
import { loadEnabledOnboardingTips, isUserEligibleForOnboardingTips } from "@/lib/onboarding-tips/store";
import { ONBOARDING_TIPS_NEW_USER_DAYS } from "@/lib/onboarding-tips/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const onboardingComplete = Boolean(session?.user?.onboardingComplete);

    if (!userId || !onboardingComplete) {
      return NextResponse.json({
        eligible: false,
        tips: [],
        newUserDays: ONBOARDING_TIPS_NEW_USER_DAYS
      });
    }

    const eligible = await isUserEligibleForOnboardingTips(userId);
    const allTips = eligible ? await loadEnabledOnboardingTips() : [];
    const tips = eligible ? await filterOnboardingTipsForUser(userId, allTips) : [];

    return NextResponse.json({
      eligible,
      tips,
      newUserDays: ONBOARDING_TIPS_NEW_USER_DAYS
    });
  } catch (error) {
    console.error("[onboarding-tips]", error);
    return NextResponse.json({ error: "Unable to load tips." }, { status: 500 });
  }
}
