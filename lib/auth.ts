import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 🔴 DODANA FLAGA: Pozwala połączyć konto Google z kontem założonym przez e-mail/hasło
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Brakujące dane logowania");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Nieprawidłowy e-mail lub hasło");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Nieprawidłowy e-mail lub hasło");
        }

        // Zwracamy obiekt usera - Prisma domyślnie dorzuci tu pole 'role' z bazy
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // 1. Przy pierwszym logowaniu 'user' istnieje - przepisz dane do tokena
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; // 🔴 PRZEPISUJEMY ROLĘ
      }
      
      // 2. Jeśli token już istnieje, ale nie ma w nim roli (np. logowanie Google), dociągnij z bazy
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role; // 🔴 DOCYTYWANIE ROLI
        }
      }
      return token;
    },
    async session({ session, token }) {
      // 3. Przekaż dane z tokena prosto do sesji widocznej na froncie
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string; // 🔴 SESJA WIDZI ROLĘ
      }
      return session;
    },
  },
};