export interface JWTPayload {
  userId: string;
  username: string;
  status: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
