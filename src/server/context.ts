import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users } from "~/db/schema";

export type UserRole = "owner" | "admin" | "veterinario" | "atendente";

export const ADMIN_ROLES: UserRole[] = ["owner", "admin"];
export const ALL_ROLES: UserRole[] = ["owner", "admin", "veterinario", "atendente"];

export async function requireAuth() {
  const [{ getWebRequest }, { auth }] = await Promise.all([
    import("@tanstack/start/server"),
    import("~/lib/auth"),
  ]);
  const req = getWebRequest();
  if (!req) throw new Error("Requisição não encontrada");

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new Error("Não autenticado");

  return session;
}

export async function requireTenant() {
  const session = await requireAuth();

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user?.tenantId) throw new Error("Pet shop não configurado");

  return {
    tenantId: user.tenantId,
    userId: session.user.id,
    userRole: user.role,
    session,
  };
}
