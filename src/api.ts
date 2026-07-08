/// <reference types="vinxi/types/server" />
import { createStartAPIHandler } from "@tanstack/start-api-routes";

async function handleAsaasWebhook(request: Request): Promise<Response> {
  const token = request.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = await request.json().catch(() => null) as { event?: string; payment?: { subscription?: string } } | null;
  const subscriptionId = body?.payment?.subscription;

  if (subscriptionId && (body?.event === "PAYMENT_CONFIRMED" || body?.event === "PAYMENT_RECEIVED")) {
    const { db } = await import("~/db");
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    await db.update(tenants)
      .set({ status: "ativo", updatedAt: new Date() })
      .where(eq(tenants.asaasSubscriptionId, subscriptionId));
  }

  if (subscriptionId && (body?.event === "PAYMENT_OVERDUE" || body?.event === "PAYMENT_DELETED" || body?.event === "PAYMENT_REFUNDED")) {
    const { db } = await import("~/db");
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    await db.update(tenants)
      .set({ status: "suspenso", updatedAt: new Date() })
      .where(eq(tenants.asaasSubscriptionId, subscriptionId));
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

async function handleTrialReminderCron(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const { db } = await import("~/db");
  const { and, eq, isNull, gte, lt } = await import("drizzle-orm");
  const { tenants } = await import("~/db/schema");
  const { enviarEmail, emailTrialAcabando } = await import("~/server/resend");

  const amanha = new Date();
  amanha.setUTCHours(0, 0, 0, 0);
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  const depoisDeAmanha = new Date(amanha);
  depoisDeAmanha.setUTCDate(depoisDeAmanha.getUTCDate() + 1);

  const candidatos = await db.query.tenants.findMany({
    where: and(
      eq(tenants.status, "trial"),
      isNull(tenants.asaasSubscriptionId),
      isNull(tenants.trialReminderSentAt),
      gte(tenants.trialEndsAt, amanha),
      lt(tenants.trialEndsAt, depoisDeAmanha),
    ),
  });

  let enviados = 0;
  for (const tenant of candidatos) {
    try {
      await enviarEmail({
        to: tenant.email,
        subject: "Seu teste grátis do PetFlow acaba amanhã",
        html: emailTrialAcabando(tenant.nome),
      });
      await db.update(tenants).set({ trialReminderSentAt: new Date() }).where(eq(tenants.id, tenant.id));
      enviados++;
    } catch (err) {
      console.error(`Falha ao enviar aviso de trial para ${tenant.email}:`, err);
    }
  }

  return new Response(JSON.stringify({ ok: true, candidatos: candidatos.length, enviados }), { status: 200 });
}

export default createStartAPIHandler(async ({ request }) => {
  const url = new URL(request.url);
  if (url.pathname === "/api/asaas/webhook") {
    return handleAsaasWebhook(request);
  }
  if (url.pathname === "/api/cron/trial-reminder") {
    return handleTrialReminderCron(request);
  }
  const { auth } = await import("~/lib/auth");
  const response = await auth.handler(request);
  return response;
});
