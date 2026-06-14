import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, PawPrint, Users, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatCurrency } from "~/lib/utils";

const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and, gte, sql, count } = await import("drizzle-orm");
  const { appointments, pets, tutores, transacoes } = await import("~/db/schema");

  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [totalPets, totalTutores, agendamentosHoje, receitaMes] = await Promise.all([
    db.select({ count: count() }).from(pets).where(and(eq(pets.tenantId, tenantId), eq(pets.ativo, true))),
    db.select({ count: count() }).from(tutores).where(and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true))),
    db.select({ count: count() }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.data, hoje))),
    db.select({ total: sql<string>`coalesce(sum(valor), 0)` }).from(transacoes).where(and(eq(transacoes.tenantId, tenantId), eq(transacoes.tipo, "receita"), gte(transacoes.data, inicioMes))),
  ]);

  const proximosAgendamentos = await db.query.appointments.findMany({
    where: and(eq(appointments.tenantId, tenantId), gte(appointments.data, hoje)),
    with: { pet: true, tutor: true, service: true },
    orderBy: (a, { asc }) => [asc(a.data), asc(a.horaInicio)],
    limit: 5,
  });

  return {
    totalPets: totalPets[0]?.count ?? 0,
    totalTutores: totalTutores[0]?.count ?? 0,
    agendamentosHoje: agendamentosHoje[0]?.count ?? 0,
    receitaMes: parseFloat(receitaMes[0]?.total ?? "0"),
    proximosAgendamentos,
  };
});

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const kpis = [
    { label: "Pets Cadastrados", value: data?.totalPets ?? 0, icon: PawPrint, color: "text-primary" },
    { label: "Tutores", value: data?.totalTutores ?? 0, icon: Users, color: "text-info" },
    { label: "Agendamentos Hoje", value: data?.agendamentosHoje ?? 0, icon: CalendarDays, color: "text-warning" },
    { label: "Receita do Mês", value: formatCurrency(data?.receitaMes ?? 0), icon: DollarSign, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bem-vindo ao PetFlow</h2>
        <p className="text-sm text-muted-foreground">Resumo do seu negócio</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "..." : kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !data?.proximosAgendamentos.length ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento próximo</p>
          ) : (
            <div className="space-y-3">
              {data.proximosAgendamentos.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{a.pet?.nome} <span className="text-muted-foreground">({a.tutor?.nome})</span></p>
                    <p className="text-xs text-muted-foreground">{a.service?.nome} · {a.data} {a.horaInicio}</p>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
