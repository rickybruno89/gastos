import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    signIn: async ({ user, account }) => {
      console.log("here");

      // if (account!.provider === "google") {
      // const { name, email } = user;
      // await connectMongoDB();
      // const userExists = await User.findOne({ email });
      // if (!userExists) {
      //   const res = await fetch("http://localhost:3000/api/user", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       name,
      //       email,
      //     }),
      //   });

      //   if (res.ok) {
      //     return user;
      //   }
      // }
      // }
      return true;
    },
    jwt: async ({ token, user }) => {
      console.log("here");
      if (user) {
        token.user = user;
      }
      return token;
    },
    session: async ({ session, token }) => {
      console.log("here");
      session.user = {
        ...session.user,
        // @ts-expect-error
        id: token.sub,
        // @ts-expect-error
        username: token?.user?.username || token?.user?.gh_username,
      };
      return session;
    },
  },
};
