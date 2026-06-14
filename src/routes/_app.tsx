import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { AppSidebar } from "~/components/layout/sidebar";
import { AppHeader } from "~/components/layout/header";

const checkSession = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getWebRequest }, { auth }] = await Promise.all([
    import("@tanstack/start/server"),
    import("~/lib/auth"),
  ]);
  const req = getWebRequest();
  if (!req) return null;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;

  const { db } = await import("~/db");
  const { eq } = await import("drizzle-orm");
  const { users, tenants } = await import("~/db/schema");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { tenantId: true, role: true },
  });

  if (!user?.tenantId) {
    throw redirect({ to: "/onboarding" });
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId),
    columns: { nome: true },
  });

  return {
    session,
    tenantNome: tenant?.nome ?? "",
    userRole: user.role ?? "atendente",
  };
});

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const data = await checkSession();
    if (!data) throw redirect({ to: "/login" });
    return { session: data.session, tenantNome: data.tenantNome, userRole: data.userRole };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
