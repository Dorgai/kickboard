import { HomeShell } from "@/components/home-shell";

/** Client data loads in the browser; avoid year-long static HTML cache of an empty shell. */
export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeShell />;
}
