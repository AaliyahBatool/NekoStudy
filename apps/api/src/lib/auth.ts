export interface TokenPayload {
  userId: string;
}

export function verifyToken(_token: string): Promise<TokenPayload | null> {
  // TODO(M1): Implement real JWT verification.
  return Promise.resolve(null);
}
