import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboardingComplete: boolean;
      pointsBalance: number;
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingComplete?: boolean;
    pointsBalance?: number;
    isAdmin?: boolean;
    email?: string;
  }
}
