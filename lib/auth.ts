import { getServerSession, type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/",
  },
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.user = user;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const userDb = await prisma.user.findUnique({
        where: {
          id: token.sub,
        },
      });

      if (!userDb) return null;

      session.user = {
        ...session.user,
        id: userDb.id,
      };
      return session;
    },
  },
};

export const getAuthUserId = async () => {
  const session = await getServerSession(nextAuthOptions);
  return session!.user.id;
};
