import NextAuth from 'next-auth';

type AuthPlanKey =
  | 'free'
  | 'starter_monthly'
  | 'starter_yearly'
  | 'focused_monthly'
  | 'focused_yearly'
  | 'smart_quarterly'
  | 'smart_yearly'
  | 'pro_monthly'
  | 'pro_quarterly'
  | 'pro_yearly'
  | 'pro_lifetime';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      uid?: string;
      email: string;
      name: string;
      firstName?: string;
      lastName?: string;
      image?: string;
      role?: string;
      type?: 'user' | 'admin';
      planKey?: AuthPlanKey;
      subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'expired';
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    uid?: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    image?: string;
    role?: string;
    type?: 'user' | 'admin';
    planKey?: AuthPlanKey;
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'expired';
    emailVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    uid?: string;
    email?: string;
    name?: string;
    image?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    type?: 'user' | 'admin';
    planKey?: AuthPlanKey;
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'expired';
    emailVerified?: boolean;
  }
}
