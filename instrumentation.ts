/** Run Auth.js env bootstrap as early as possible on the Node server. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAuthEnv } = await import("@/lib/auth/env");
    bootstrapAuthEnv();
  }
}
