import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

declare global {
  // Cache for Mongoose connection in Node runtime
  var mongooseCache: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
  var _mongoClientPromise: Promise<MongoClient>;
}

export {};

declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: any;
    metadata: any;
    version: string;
  }
  
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export default pdfParse;
  export = pdfParse;
}

declare module 'mammoth' {
  interface ExtractResult {
    value: string;
    messages: any[];
  }
  
  interface Options {
    buffer: Buffer;
  }
  
  function extractRawText(options: Options): Promise<ExtractResult>;
  export = { extractRawText };
}

// NextAuth session type extensions
declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // MongoDB user ID
      firstName?: string;
      lastName?: string;
      role?: string;
      emailVerified?: boolean;
      email?: string;
      name?: string;
      image?: string;
    };
  }

  interface User {
    id: string; // MongoDB user ID
    firstName?: string;
    lastName?: string;
    role?: string;
    emailVerified?: boolean;
    email?: string;
    name?: string;
    image?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string; // Subject (user ID)
    firstName?: string;
    lastName?: string;
    role?: string;
    emailVerified?: boolean;
    email?: string;
    name?: string;
    picture?: string;
  }
}