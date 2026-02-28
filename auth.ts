import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const ADMIN_EMAILS = (process.env.AUTH_ADMIN_EMAILS ?? "v2studiosk@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

const CREDENTIALS_EMAIL = process.env.AUTH_ADMIN_EMAIL?.trim().toLowerCase();
const CREDENTIALS_PASSWORD = process.env.AUTH_ADMIN_PASSWORD;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!CREDENTIALS_EMAIL || !CREDENTIALS_PASSWORD || !email || !password) {
          return null;
        }
        if (email !== CREDENTIALS_EMAIL || password !== CREDENTIALS_PASSWORD) {
          return null;
        }
        return { id: "admin", email, name: "Admin" };
      },
    }),
    Google,
  ],
  pages: {
    signIn: "/admin/signin",
  },
  callbacks: {
    signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      return ADMIN_EMAILS.includes(email);
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/signin")) {
        return !!auth;
      }
      return true;
    },
  },
  trustHost: true,
});
