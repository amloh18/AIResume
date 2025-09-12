import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      uid?: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      image?: string;
      role?: string;
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    uid?: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    image?: string;
    role?: string;
    emailVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    uid?: string;
    firstName: string;
    lastName: string;
    role?: string;
    emailVerified?: boolean;
  }
} 