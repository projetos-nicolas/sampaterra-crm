import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Session } from "next-auth";

export interface Context {
  session: Session | null;
  prisma: typeof prisma;
}

export async function createContext(): Promise<Context> {
  const session = await auth();
  return {
    session,
    prisma,
  };
}
