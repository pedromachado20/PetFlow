import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  const { buscarPrimeiraFatura } = await import("~/server/asaas");
  const { SUBSCRIPTION_PRICE } = await import("~/lib/billing");

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { nome: true, planoSaas: true, status: true, trialEndsAt: true, asaasSubscriptionId: true, cnpj: true },
  });

  // Se existe assinatura mas ainda não está paga, busca a fatura pendente de novo
  // a cada carregamento — assim o link nunca fica "perdido" depois que o usuário sai da tela.
  let fatura: { invoiceUrl: string; valor: number; vencimento: string } | null = null;
  if (tenant?.asaasSubscriptionId && tenant.status !== "ativo") {
    const cobranca = await buscarPrimeiraFatura(tenant.asaasSubscriptionId).catch(() => undefined);
    if (cobranca) fatura = { invoiceUrl: cobranca.invoiceUrl, valor: cobranca.value, vencimento: cobranca.dueDate };
  }

  return { ...tenant, preco: SUBSCRIPTION_PRICE, fatura };
});

const assinarAgora = createServerFn({ method: "POST" })
  .validator(z.object({ cnpj: z.string().optional() }))
  .handler(async ({ data }) => {
    const { requireTenant, requireRole, ADMIN_ROLES } = await import("~/server/context");
    const { tenantId, userRole } = await requireTenant();
    requireRole(userRole, ADMIN_ROLES);
    const { db } = await import("~/db");
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    const { criarCliente, criarAssinatura, buscarPrimeiraFatura } = await import("~/server/asaas");
    const { SUBSCRIPTION_PRICE } = await import("~/lib/billing");

    if (data.cnpj?.trim()) {
      await db.update(tenants).set({ cnpj: data.cnpj.trim(), updatedAt: new Date() }).where(eq(tenants.id, tenantId));
    }

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) throw new Error("Pet shop não encontrado");
    if (tenant.asaasSubscriptionId) throw new Error("Já existe uma assinatura ativa");
    if (!tenant.cnpj) throw new Error("Preencha o CPF ou CNPJ do pet shop antes de assinar");

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

    // A fatura pode levar um instante para ficar disponível no Asaas — tenta de novo uma vez
    let fatura = await buscarPrimeiraFatura(assinatura.id).catch(() => undefined);
    if (!fatura?.invoiceUrl) {
      await new Promise((r) => setTimeout(r, 1500));
      fatura = await buscarPrimeiraFatura(assinatura.id).catch(() => undefined);
    }
    return { invoiceUrl: fatura?.invoiceUrl };
  });

const verificarPagamento = createServerFn({ method: "POST" }).handler(async () => {
  const { requireTenant, requireRole, ADMIN_ROLES } = await import("~/server/context");
  const { tenantId, userRole } = await requireTenant();
  requireRole(userRole, ADMIN_ROLES);
  const { db } = await import("~/db");
  const { eq } = await import("drizzle-orm");
  const { tenants } = await import("~/db/schema");
  const { buscarPrimeiraFatura } = await import("~/server/asaas");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant?.asaasSubscriptionId) throw new Error("Nenhuma assinatura encontrada");

  const fatura = await buscarPrimeiraFatura(tenant.asaasSubscriptionId).catch(() => undefined);
  const pago = fatura?.status === "RECEIVED" || fatura?.status === "CONFIRMED";
  if (pago && tenant.status !== "ativo") {
    await db.update(tenants).set({ status: "ativo", updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  }
  return { pago };
});

export const Route = createFileRoute("/_app/assinatura/")({
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const qc = useQueryClient();
  const { userRole } = useRouteContext({ from: "/_app" }) as { userRole?: UserRole };
  const isAdmin = userRole === "owner" || userRole === "admin";
  const { data, isLoading } = useQuery({ queryKey: ["assinatura"], queryFn: () => getAssinatura() });
  const [cnpjInput, setCnpjInput] = useState("");

  const assinarMut = useMutation({
    mutationFn: (cnpj?: string) => assinarAgora({ data: { cnpj } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assinatura"] });
      if (res.invoiceUrl) {
        toast.success("Assinatura criada! Abrindo fatura para pagamento...");
        window.open(res.invoiceUrl, "_blank");
      } else {
        toast.success("Assinatura criada! A fatura vai aparecer aqui em instantes.");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar assinatura"),
  });

  const verificarMut = useMutation({
    mutationFn: () => verificarPagamento(),
    onSuccess: (res) => {
      if (res.pago) {
        qc.invalidateQueries({ queryKey: ["assinatura"] });
        toast.success("Pagamento confirmado! Acesso liberado.");
      } else {
        toast.info("Pagamento ainda não confirmado.");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao verificar pagamento"),
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

          {data?.status === "ativo" && (
            <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-sm">Sua assinatura está em dia. Obrigado por confiar no PetFlow!</p>
            </div>
          )}

          {data?.status === "suspenso" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">Sua assinatura está com pagamento pendente. Regularize para recuperar o acesso.</p>
            </div>
          )}

          {data?.asaasSubscriptionId && data.status !== "ativo" && (
            <div className="space-y-2">
              {data.fatura ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Valor: <strong>{formatCurrency(data.fatura.valor)}</strong> · Vence em{" "}
                    {new Date(data.fatura.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  <a href={data.fatura.invoiceUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full">
                      <ExternalLink className="h-4 w-4" /> Ir para pagamento (PIX, cartão ou boleto)
                    </Button>
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Gerando a fatura, atualize a página em instantes...</p>
              )}
              <Button variant="ghost" className="w-full" disabled={verificarMut.isPending} onClick={() => verificarMut.mutate()}>
                <RefreshCw className="h-4 w-4" />
                {verificarMut.isPending ? "Verificando..." : "Verificar pagamento"}
              </Button>
            </div>
          )}

          {!data?.asaasSubscriptionId && isAdmin && !data?.cnpj && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm">Para gerar a cobrança, precisamos do CPF ou CNPJ do pet shop (dados de cobrança exigidos pelo Asaas).</p>
              </div>
              <div className="space-y-1.5">
                <Label>CPF ou CNPJ</Label>
                <Input placeholder="00.000.000/0000-00" value={cnpjInput} onChange={(e) => setCnpjInput(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={assinarMut.isPending || cnpjInput.trim().length < 11}
                onClick={() => assinarMut.mutate(cnpjInput.trim())}
              >
                <CreditCard className="h-4 w-4" />
                {assinarMut.isPending ? "Processando..." : "Salvar e assinar"}
              </Button>
            </div>
          )}

          {!data?.asaasSubscriptionId && isAdmin && data?.cnpj && (
            <Button className="w-full" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate(undefined)}>
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
