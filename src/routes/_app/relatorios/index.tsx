import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, PawPrint, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatCurrency } from "~/lib/utils";

const getRelatorios = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and, gte, sql, count } = await import("drizzle-orm");
  const { appointments, pets, tutores, transacoes, assinaturas } = await import("~/db/schema");

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [
    totalPets, totalTutores, totalAgendamentos,
    receitaMes, assinaturasAtivas,
    topServicos,
  ] = await Promise.all([
    db.select({ count: count() }).from(pets).where(and(eq(pets.tenantId, tenantId), eq(pets.ativo, true))),
    db.select({ count: count() }).from(tutores).where(and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true))),
    db.select({ count: count() }).from(appointments).where(and(eq(appointments.tenantId, tenantId), gte(appointments.data, inicioMes))),
    db.select({ total: sql<string>`coalesce(sum(valor), 0)` }).from(transacoes).where(and(eq(transacoes.tenantId, tenantId), eq(transacoes.tipo, "receita"), gte(transacoes.data, inicioMes))),
    db.select({ count: count() }).from(assinaturas).where(and(eq(assinaturas.tenantId, tenantId), eq(assinaturas.status, "ativa"))),
    db.select({
      serviceId: appointments.serviceId,
      total: count(),
    }).from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), gte(appointments.data, inicioMes)))
      .groupBy(appointments.serviceId)
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ]);

  return {
    totalPets: totalPets[0]?.count ?? 0,
    totalTutores: totalTutores[0]?.count ?? 0,
    totalAgendamentos: totalAgendamentos[0]?.count ?? 0,
    receitaMes: parseFloat(receitaMes[0]?.total ?? "0"),
    assinaturasAtivas: assinaturasAtivas[0]?.count ?? 0,
    topServicos,
  };
});

export const Route = createFileRoute("/_app/relatorios/")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorios"],
    queryFn: () => getRelatorios(),
  });

  const kpis = [
    { label: "Pets Cadastrados", value: data?.totalPets ?? 0, icon: PawPrint },
    { label: "Tutores", value: data?.totalTutores ?? 0, icon: Users },
    { label: "Agendamentos no Mês", value: data?.totalAgendamentos ?? 0, icon: BarChart3 },
    { label: "Assinaturas Ativas", value: data?.assinaturasAtivas ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "..." : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Receita do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-success">{isLoading ? "..." : formatCurrency(data?.receitaMes ?? 0)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Serviços do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !data?.topServicos.length ? (
            <p className="text-sm text-muted-foreground">Sem dados este mês</p>
          ) : (
            <div className="space-y-2">
              {data.topServicos.map((s, i) => (
                <div key={s.serviceId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">#{i + 1} {s.serviceId}</span>
                  <span className="font-semibold">{s.total} agendamentos</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
