export { default } from "next-auth/middleware";

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ["/dashboard/:path*"],
};
