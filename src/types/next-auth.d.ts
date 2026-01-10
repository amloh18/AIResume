import NextAuth from 'next-auth';

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
      planKey?: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime';
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
    planKey?: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime';
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
    planKey?: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime';
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'expired';
    emailVerified?: boolean;
  }
} 