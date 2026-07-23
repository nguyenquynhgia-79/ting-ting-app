export interface JWTPayload {
  userId: string;
  username: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
