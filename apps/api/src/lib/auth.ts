export interface TokenPayload {
  userId: string;
}

export async function verifyToken(
  _token: string,
): Promise<TokenPayload | null> {
  // TODO(M1): Implement real JWT verification.
  return null;
}