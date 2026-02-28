import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null;
      image?: string | null;
      name?: string | null;
    };
  }
}
