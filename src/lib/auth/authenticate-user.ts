import { verifyPassword } from "./password";
import { loginSchema } from "../validations/auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type UserRecord = AuthUser & { password: string };

export async function authenticateUser(
  credentials: Record<string, unknown>,
  findUserByEmail: (email: string) => Promise<UserRecord | null>
): Promise<AuthUser | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await findUserByEmail(parsed.data.email);
  if (!user) return null;

  const isValid = await verifyPassword(parsed.data.password, user.password);
  if (!isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
