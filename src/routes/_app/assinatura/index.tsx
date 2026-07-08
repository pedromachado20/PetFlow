import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, hojeLocal } from "~/lib/utils";
import type { UserRole } from "~/server/context";

const getAssinatura = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { tenantId } = await requireTenant();
  const { db } = await import("~/db");
  const { eq } = await import("drizzle-orm");
  const { tenants } = await import("~/db/schema");
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { nome: true, planoSaas: true, status: true, trialEndsAt: true, asaasSubscriptionId: true },
  });
  const { SUBSCRIPTION_PRICE } = await import("~/lib/billing");
  return { ...tenant, preco: SUBSCRIPTION_PRICE };
});

const assinarAgora = createServerFn({ method: "POST" }).handler(async () => {
  const { requireTenant, requireRole, ADMIN_ROLES } = await import("~/server/context");
  const { tenantId, userRole } = await requireTenant();
  requireRole(userRole, ADMIN_ROLES);
  const { db } = await import("~/db");
  const { eq } = await import("drizzle-orm");
  const { tenants } = await import("~/db/schema");
  const { criarCliente, criarAssinatura, buscarPrimeiraFatura } = await import("~/server/asaas");
  const { SUBSCRIPTION_PRICE } = await import("~/lib/billing");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error("Pet shop não encontrado");
  if (tenant.asaasSubscriptionId) throw new Error("Já existe uma assinatura ativa");
  if (!tenant.cnpj) throw new Error("Preencha o CPF ou CNPJ do pet shop em Configurações antes de assinar");

  let customerId = tenant.asaasCustomerId;
  if (!customerId) {
    const cliente = await criarCliente({ nome: tenant.nome, email: tenant.email, telefone: tenant.telefone ?? undefined, cpfCnpj: tenant.cnpj });
    customerId = cliente.id;
    await db.update(tenants).set({ asaasCustomerId: customerId, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  }

  const hoje = hojeLocal();
  const assinatura = await criarAssinatura({
    customerId,
    valor: SUBSCRIPTION_PRICE,
    vencimento: hoje,
    descricao: "Assinatura PetFlow",
  });

  await db.update(tenants)
    .set({ asaasCustomerId: customerId, asaasSubscriptionId: assinatura.id, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  const fatura = await buscarPrimeiraFatura(assinatura.id).catch(() => undefined);
  return { invoiceUrl: fatura?.invoiceUrl };
});

export const Route = createFileRoute("/_app/assinatura/")({
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const qc = useQueryClient();
  const { userRole } = useRouteContext({ from: "/_app" }) as { userRole?: UserRole };
  const isAdmin = userRole === "owner" || userRole === "admin";
  const { data, isLoading } = useQuery({ queryKey: ["assinatura"], queryFn: () => getAssinatura() });

  const assinarMut = useMutation({
    mutationFn: () => assinarAgora(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assinatura"] });
      if (res.invoiceUrl) {
        toast.success("Assinatura criada! Abrindo fatura para pagamento...");
        window.open(res.invoiceUrl, "_blank");
      } else {
        toast.success("Assinatura criada!");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar assinatura"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const trialEndsAt = data?.trialEndsAt ? new Date(data.trialEndsAt) : null;
  const diasRestantes = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe o status do seu plano e a cobrança do PetFlow.</p>
      </div>

      <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-3">
        <p className="font-semibold">Plano PetFlow</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>7 dias de teste grátis, sem cartão de crédito</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>Depois, apenas <strong>{formatCurrency(data?.preco ?? 0)}</strong> por mês</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>Acesso completo: Agenda, Tutores, Pets, Produtos, Financeiro, Caixa e Relatórios</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>Sem fidelidade — seus dados continuam guardados mesmo se a assinatura ficar em atraso</span>
          </li>
        </ul>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <CardTitle className="text-base">Assinatura</CardTitle>
          </div>
          {data?.status === "ativo" && <Badge variant="success">Assinatura ativa</Badge>}
          {data?.status === "trial" && <Badge variant="secondary">Trial</Badge>}
          {data?.status === "suspenso" && <Badge variant="destructive">Suspenso</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.status === "trial" && !data?.asaasSubscriptionId && (
            <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
              <Clock className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">
                  {diasRestantes !== null ? `${diasRestantes} dia(s) restante(s) no período de teste` : "Período de teste em andamento"}
                </p>
                <p className="text-muted-foreground mt-1">Sem cartão de crédito necessário durante o trial.</p>
              </div>
            </div>
          )}

          {data?.asaasSubscriptionId && (
            <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-sm">Assinatura criada. Acompanhe o pagamento pelo link enviado pelo Asaas.</p>
            </div>
          )}

          {!data?.asaasSubscriptionId && isAdmin && (
            <Button className="w-full" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate()}>
              <CreditCard className="h-4 w-4" />
              {assinarMut.isPending ? "Criando assinatura..." : "Quero assinar agora"}
            </Button>
          )}
          {!data?.asaasSubscriptionId && !isAdmin && (
            <p className="text-sm text-muted-foreground text-center">Fale com o administrador do pet shop para assinar o plano.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
