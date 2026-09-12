import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? (session.user.id as string) : null;
}