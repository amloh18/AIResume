import { JwtPayload } from 'jsonwebtoken';

/**
 * Extended JWT Payload interface for application tokens
 * Extends the base JwtPayload from jsonwebtoken library
 */
export interface MyJwtPayload extends JwtPayload {
  userId?: string;
  id?: string; // Alternative to userId (some tokens use 'id')
  email?: string;
  role?: string;
  type?: string; // Token type (e.g., 'extension')
  [key: string]: any; // Allow for additional custom properties
}

