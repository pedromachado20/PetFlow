import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getWebRequest }, { auth }] = await Promise.all([
    import("@tanstack/start/server"),
    import("~/lib/auth"),
  ]);
  const req = getWebRequest();
  if (!req) return false;
  const session = await auth.api.getSession({ headers: req.headers });
  return !!session;
});

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const isAuth = await checkAuth();
    throw redirect({ to: isAuth ? "/dashboard" : "/login" });
  },
  component: () => null,
});
