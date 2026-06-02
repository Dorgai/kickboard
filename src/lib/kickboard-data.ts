import {
  BarChart3,
  BellRing,
  Bot,
  Crown,
  Database,
  Flame,
  HeartHandshake,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
  WalletCards
} from "lucide-react";

export type Icon = typeof Trophy;

export type ServicePlan = {
  name: string;
  railwayService: string;
  icon: Icon;
  purpose: string;
  createNow: boolean;
  variables: string[];
};

export type FeatureCard = {
  title: string;
  icon: Icon;
  summary: string;
  status: "phase-1" | "phase-2" | "phase-3" | "later";
};

/** Primary header links — detail lives in Current event / Past events tabs on Home. */
export const navigation = ["Home", "Community"] as const;

export const matchEvents = [
  { minute: "12'", type: "Goal", detail: "Vinicius Junior finishes a low Rodrygo cross", tone: "goal" },
  { minute: "34'", type: "Yellow card", detail: "Aurelien Tchouameni is booked in midfield", tone: "danger" },
  { minute: "56'", type: "Substitution", detail: "France add pace from the bench", tone: "brand" },
  { minute: "73'", type: "Live", detail: "Brazil lead possession 58% to 42%", tone: "live" }
] as const;

export const widgets = [
  {
    title: "Live Match",
    eyebrow: "73' LIVE",
    body: "Brazil 2-1 France",
    meta: "Prediction: Brazil 2-1 -> exact score live"
  },
  {
    title: "Bracket Mini",
    eyebrow: "Group stage",
    body: "Groups A-D progressing",
    meta: "Next match starts in 02:14:08"
  },
  {
    title: "Coach Board",
    eyebrow: "Latest",
    body: "3 new squad shares from friends",
    meta: "Social widgets hidden for child accounts"
  },
  {
    title: "Wallet",
    eyebrow: "Fan points",
    body: "142 pts",
    meta: "Rank #38 globally, non-monetary ledger"
  }
] as const;

export const featureCards: FeatureCard[] = [
  {
    title: "Widget dashboard",
    icon: LayoutDashboard,
    summary: "Customisable home canvas with live score, bracket, wallet, feed and analytics widgets.",
    status: "phase-1"
  },
  {
    title: "Tournament data",
    icon: Trophy,
    summary: "World Cup teams, players, matches, standings, events and status updates.",
    status: "phase-1"
  },
  {
    title: "Live engagement",
    icon: Radio,
    summary: "WebSocket-ready match events, voting, ratings, predictions and toast notifications.",
    status: "phase-2"
  },
  {
    title: "Coach Board",
    icon: MessageCircle,
    summary: "Moderated feed for squads, predictions, ratings, reactions and comments.",
    status: "phase-2"
  },
  {
    title: "Virtual wallet",
    icon: WalletCards,
    summary: "Append-only points ledger with no cash value, transfers or paid entry mechanics.",
    status: "phase-3"
  },
  {
    title: "Pro analytics",
    icon: BarChart3,
    summary: "Heat maps, xG charts, guided queries and eventual Elite exports over licensed data.",
    status: "later"
  }
];

export const safetyPillars = [
  {
    title: "Child-safe by default",
    icon: ShieldCheck,
    detail: "Under-13 accounts stay in Fan Mode with no DMs, no public profile and no upgrade prompts."
  },
  {
    title: "No betting surface",
    icon: LockKeyhole,
    detail: "Predictions award internal points only. Points cannot be bought, transferred or redeemed."
  },
  {
    title: "Moderated community",
    icon: HeartHandshake,
    detail: "Posts and Fan Chat are live by default; admins can hide, remove, and manage accounts from the dashboard."
  },
  {
    title: "Licensed data path",
    icon: Database,
    detail: "Live data, open historical datasets and AI portraits stay separated with clear provenance."
  }
] as const;

export const railwayServices: ServicePlan[] = [
  {
    name: "Next.js Web",
    railwayService: "Web service from this GitHub repo",
    icon: LayoutDashboard,
    purpose: "Hosts the SSR/PWA frontend, API route health checks and initial BFF endpoints.",
    createNow: true,
    variables: ["NEXT_PUBLIC_APP_URL", "DATABASE_URL", "REDIS_URL", "JWT_SECRET"]
  },
  {
    name: "PostgreSQL",
    railwayService: "Railway Postgres plugin",
    icon: Database,
    purpose: "Primary relational store for users, tournament data, social graph, subscriptions and audit logs.",
    createNow: true,
    variables: ["DATABASE_URL"]
  },
  {
    name: "Redis",
    railwayService: "Railway Redis plugin",
    icon: Radio,
    purpose: "Cache, pub/sub, rate-limit counters, leaderboard sorted sets and live match fan-out.",
    createNow: true,
    variables: ["REDIS_URL"]
  },
  {
    name: "Worker",
    railwayService: "Background worker service from same repo",
    icon: Bot,
    purpose: "Runs match polling, moderation jobs, wallet settlement, GDPR deletion and notification delivery.",
    createNow: false,
    variables: ["DATABASE_URL", "REDIS_URL", "API_FOOTBALL_KEY", "STRIPE_WEBHOOK_SECRET"]
  },
  {
    name: "Analytics API",
    railwayService: "Optional FastAPI service later",
    icon: BarChart3,
    purpose: "Isolates Pro/Elite analytics, StatsBomb ingestion and heavier query workloads.",
    createNow: false,
    variables: ["DATABASE_URL", "REDIS_URL"]
  }
];

export const tiers = [
  {
    name: "Fan",
    icon: Users,
    price: "Free",
    summary: "Bracket, player cards, squad builder, social, predictions and wallet points."
  },
  {
    name: "Pro",
    icon: Flame,
    price: "EUR 7/mo",
    summary: "Full stats, heat maps, guided analytics, private squads and richer event toasts."
  },
  {
    name: "Elite",
    icon: Crown,
    price: "EUR 18/mo",
    summary: "Custom analytics builder, StatsBomb event data, exports and read-only API access."
  }
];

export const requiredEnv = ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"] as const;

export function getConfigReadiness() {
  return requiredEnv.map((key) => ({
    key,
    configured: Boolean(process.env[key])
  }));
}

export const notifications = [
  "Goal toasts use assertive live regions.",
  "Standard match updates use polite live regions.",
  "Every motion path has a reduced-motion fallback.",
  "Interactive targets are designed around a 44px minimum."
] as const;
