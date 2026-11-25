import { getUserById } from "../services/authService";

type Account = { id: number; sessionVersion?: number | null };

export function oauthAccountId(user: Account) {
  return `${user.id}:${user.sessionVersion ?? 0}`;
}

export async function findOAuthAccount(id: string) {
  if (!/^\d+:\d+$/.test(id)) return undefined;
  const user = await getUserById(Number(id.split(":")[0]));
  return user && oauthAccountId(user) === id ? user : undefined;
}
