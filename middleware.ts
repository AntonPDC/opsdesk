import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/admin/:path*",
    "/api/tickets/:path*",
    "/api/comments/:path*",
    "/api/audit/:path*",
    "/api/users/:path*",
    "/api/metrics/:path*",
  ],
};
