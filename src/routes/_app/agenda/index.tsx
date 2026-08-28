import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Printer } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { cn, formatCurrency } from "~/lib/utils";
import { printTable } from "~/lib/pdf";

const getAgenda = createServerFn({ method: "GET" })
  .validator(z.object({ inicio: z.string(), fim: z.string() }))
  .handler(async ({ data: { inicio, fim } }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and, gte, lte } = await import("drizzle-orm");
    const { appointments, pets: petsSchema, professionals, services } = await import("~/db/schema");

    const [agendamentos, profissionais, petsLista, servicos] = await Promise.all([
      db.query.appointments.findMany({
        where: and(eq(appointments.tenantId, tenantId), gte(appointments.data, inicio), lte(appointments.data, fim)),
        with: { pet: true, tutor: true, professional: true, service: true },
        orderBy: (a, { asc }) => [asc(a.data), asc(a.horaInicio)],
      }),
      db.query.professionals.findMany({ where: and(eq(professionals.tenantId, tenantId), eq(professionals.ativo, true)) }),
      db.query.pets.findMany({ where: and(eq(petsSchema.tenantId, tenantId), eq(petsSchema.ativo, true)), with: { tutor: true } }),
      db.query.services.findMany({ where: and(eq(services.tenantId, tenantId), eq(services.ativo, true)) }),
    ]);

    return { agendamentos, profissionais, pets: petsLista, servicos };
  });

const salvarAgendamento = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    petId: z.string(),
    professionalId: z.string(),
    serviceId: z.string(),
    data: z.string(),
    horaInicio: z.string(),
    horaFim: z.string(),
    observacoes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { appointments, pets, services, professionals } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const pet = await db.query.pets.findFirst({ where: and(eq(pets.id, data.petId), eq(pets.tenantId, tenantId)) });
    const service = await db.query.services.findFirst({ where: and(eq(services.id, data.serviceId), eq(services.tenantId, tenantId)) });
    const professional = await db.query.professionals.findFirst({ where: and(eq(professionals.id, data.professionalId), eq(professionals.tenantId, tenantId)) });
    if (!pet || !service || !professional) throw new Error("Pet, serviço ou profissional não encontrado");

    if (data.id) {
      await db.update(appointments)
        .set({ petId: data.petId, tutorId: pet!.tutorId, professionalId: data.professionalId, serviceId: data.serviceId, data: data.data, horaInicio: data.horaInicio, horaFim: data.horaFim, preco: service?.preco ?? "0", observacoes: data.observacoes, updatedAt: new Date() })
        .where(and(eq(appointments.id, data.id), eq(appointments.tenantId, tenantId)));
    } else {
      await db.insert(appointments).values({
        id: crypto.randomUUID(), tenantId,
        tutorId: pet!.tutorId, petId: data.petId,
        professionalId: data.professionalId, serviceId: data.serviceId,
        data: data.data, horaInicio: data.horaInicio, horaFim: data.horaFim,
        preco: service?.preco ?? "0", observacoes: data.observacoes,
      });
    }
  });

const alterarStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { appointments } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(appointments).set({ status: data.status as any }).where(and(eq(appointments.id, data.id), eq(appointments.tenantId, tenantId)));
  });

const excluirAgendamento = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { appointments } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.delete(appointments).where(and(eq(appointments.id, data.id), eq(appointments.tenantId, tenantId)));
  });

const statusColors: Record<string, string> = {
  agendado: "secondary", confirmado: "outline", em_atendimento: "warning",
  concluido: "success", cancelado: "destructive", faltou: "destructive",
};

const statusChipClass: Record<string, string> = {
  agendado: "bg-secondary text-secondary-foreground",
  confirmado: "bg-info text-primary-foreground",
  em_atendimento: "bg-warning text-background",
  concluido: "bg-success text-primary-foreground",
  cancelado: "bg-destructive text-destructive-foreground",
  faltou: "bg-muted-foreground text-background",
};

const STATUS_OPTIONS = ["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "faltou"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmtData(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function partesData(str: string) {
  const partes = str.split("-").map(Number);
  const ano = partes[0]!, mes = partes[1]!, dia = partes[2]!;
  return { ano, mes: mes - 1, dia };
}

function montarCelulasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(ano, mes, 1 - primeiroDia.getDay());
  const celulas: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrade);
    d.setDate(inicioGrade.getDate() + i);
    celulas.push(d);
  }
  return celulas;
}

type Agendamento = Awaited<ReturnType<typeof getAgenda>>["agendamentos"][number];

export const Route = createFileRoute("/_app/agenda/")({
  component: AgendaPage,
});

function AgendaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const hoje = fmtData(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [visao, setVisao] = useState<"mes" | "dia">("mes");

  const [petSel, setPetSel] = useState("");
  const [proSel, setProSel] = useState("");
  const [svcSel, setSvcSel] = useState("");
  const [dataSel, setDataSel] = useState(diaSelecionado);
  const [horaInicioSel, setHoraInicioSel] = useState("");
  const [horaFimSel, setHoraFimSel] = useState("");
  const [obsVal, setObsVal] = useState("");

  const { ano, mes } = partesData(diaSelecionado);
  const inicioMes = `${ano}-${pad2(mes + 1)}-01`;
  const fimMes = fmtData(new Date(ano, mes + 1, 0));

  const { data, isLoading } = useQuery({
    queryKey: ["agenda", ano, mes],
    queryFn: () => getAgenda({ data: { inicio: inicioMes, fim: fimMes } }),
  });

  const agendamentosPorDia = useMemo(() => {
    const mapa: Record<string, Agendamento[]> = {};
    for (const a of data?.agendamentos ?? []) {
      (mapa[a.data] ??= []).push(a);
    }
    return mapa;
  }, [data?.agendamentos]);

  const agendamentosDoDia = agendamentosPorDia[diaSelecionado] ?? [];

  function abrirNovo() {
    setEditando(null);
    setPetSel(""); setProSel(""); setSvcSel("");
    setDataSel(diaSelecionado); setHoraInicioSel(""); setHoraFimSel(""); setObsVal("");
    setOpen(true);
  }

  function abrirEditar(a: Agendamento) {
    setEditando(a);
    setPetSel(a.petId);
    setProSel(a.professionalId);
    setSvcSel(a.serviceId);
    setDataSel(a.data);
    setHoraInicioSel(a.horaInicio);
    setHoraFimSel(a.horaFim);
    setObsVal(a.observacoes ?? "");
    setOpen(true);
  }

  function buildPayload() {
    return {
      petId: petSel, professionalId: proSel, serviceId: svcSel,
      data: dataSel, horaInicio: horaInicioSel, horaFim: horaFimSel, observacoes: obsVal,
    };
  }

  const salvar = useMutation({
    mutationFn: () => salvarAgendamento({ data: { ...buildPayload(), id: editando?.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success(editando ? "Atualizado" : "Agendado"); setOpen(false); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const mudarStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => alterarStatus({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Status atualizado"); },
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirAgendamento({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Excluído"); setExcluindo(null); },
    onError: () => toast.error("Erro ao excluir"),
  });

  function mudarDia(delta: number) {
    const d = new Date(diaSelecionado + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDiaSelecionado(fmtData(d));
  }

  function mudarMes(delta: number) {
    setDiaSelecionado(fmtData(new Date(ano, mes + delta, 1)));
  }

  function selecionarMes(novoMes: number) {
    setDiaSelecionado(fmtData(new Date(ano, novoMes, 1)));
  }

  function selecionarAno(novoAno: number) {
    setDiaSelecionado(fmtData(new Date(novoAno, mes, 1)));
  }

  function handlePrint() {
    const rows = agendamentosDoDia.map((a) => [
      a.horaInicio + " – " + a.horaFim,
      a.pet?.nome ?? "-",
      a.tutor?.nome ?? "-",
      a.professional?.nome ?? "-",
      a.service?.nome ?? "-",
      formatCurrency(a.preco),
      a.status.replace("_", " "),
    ]);
    printTable(
      "Agenda",
      ["Horário", "Pet", "Tutor", "Profissional", "Serviço", "Valor", "Status"],
      rows,
      new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );
  }

  const anosDisponiveis = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);
  const celulasDoMes = montarCelulasDoMes(ano, mes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {visao === "mes" ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Select value={String(mes)} onValueChange={(v) => selecionarMes(Number(v))}>
              <SelectTrigger className="h-9 w-36"><SelectValue>{MESES[mes]}</SelectValue></SelectTrigger>
              <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => selecionarAno(Number(v))}>
              <SelectTrigger className="h-9 w-24"><SelectValue>{ano}</SelectValue></SelectTrigger>
              <SelectContent>{anosDisponiveis.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => mudarMes(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-48 text-center capitalize">
              {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setDiaSelecionado(hoje)}>Hoje</Button>
          <div className="flex items-center gap-1 rounded-lg border bg-secondary p-1">
            <Button variant={visao === "mes" ? "default" : "ghost"} size="sm" className="h-7" onClick={() => setVisao("mes")}>Mês</Button>
            <Button variant={visao === "dia" ? "default" : "ghost"} size="sm" className="h-7" onClick={() => setVisao("dia")}>Dia</Button>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!agendamentosDoDia.length}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Agendar</Button>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!petSel || !proSel || !svcSel || !dataSel || !horaInicioSel || !horaFimSel) { toast.error("Preencha todos os campos obrigatórios"); return; } salvar.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pet *</Label>
              <Select value={petSel} onValueChange={setPetSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                <SelectContent>{data?.pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tutor?.nome})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional *</Label>
              <Select value={proSel} onValueChange={setProSel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{data?.profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Serviço *</Label>
              <Select value={svcSel} onValueChange={setSvcSel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{data?.servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} — {formatCurrency(s.preco)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={dataSel} onChange={(e) => setDataSel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Início *</Label>
                <Input type="time" value={horaInicioSel} onChange={(e) => setHoraInicioSel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim *</Label>
                <Input type="time" value={horaFimSel} onChange={(e) => setHoraFimSel(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={obsVal} onChange={(e) => setObsVal(e.target.value)} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Agendar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir agendamento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" disabled={excluir.isPending} onClick={() => excluir.mutate(excluindo!)}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe do agendamento */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        {detalhe && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Agendamento</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              {[
                ["Pet",          detalhe.pet?.nome ?? "-"],
                ["Tutor",        detalhe.tutor?.nome ?? "-"],
                ["Serviço",      detalhe.service?.nome ?? "-"],
                ["Profissional", detalhe.professional?.nome ?? "-"],
                ["Horário",      `${detalhe.horaInicio} – ${detalhe.horaFim}`],
                ["Valor",        formatCurrency(detalhe.preco)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusColors[detalhe.status] as any}>{detalhe.status.replace("_", " ")}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="outline" className="w-full" onClick={() => { setDetalhe(null); abrirEditar(detalhe); }}>
                <Pencil className="h-4 w-4" /> Editar agendamento
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {
                printTable(
                  "Comprovante de Agendamento",
                  ["Campo", "Informação"],
                  [
                    ["Pet", detalhe.pet?.nome ?? "-"],
                    ["Tutor", detalhe.tutor?.nome ?? "-"],
                    ["Serviço", detalhe.service?.nome ?? "-"],
                    ["Profissional", detalhe.professional?.nome ?? "-"],
                    ["Data", new Date(detalhe.data + "T00:00:00").toLocaleDateString("pt-BR")],
                    ["Horário", `${detalhe.horaInicio} – ${detalhe.horaFim}`],
                    ["Valor", formatCurrency(detalhe.preco)],
                    ["Status", detalhe.status.replace("_", " ")],
                  ]
                );
              }}>
                <Printer className="h-4 w-4" /> Imprimir comprovante
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : visao === "mes" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <Card className="overflow-hidden py-0">
            <div className="grid grid-cols-7 border-b">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celulasDoMes.map((d) => {
                const dstr = fmtData(d);
                const noMes = d.getMonth() === mes;
                const ehHoje = dstr === hoje;
                const selecionado = dstr === diaSelecionado;
                const doDia = agendamentosPorDia[dstr] ?? [];
                return (
                  <button
                    key={dstr}
                    type="button"
                    onClick={() => setDiaSelecionado(dstr)}
                    className={cn(
                      "h-24 border-r border-b p-1.5 flex flex-col gap-1 text-left hover:bg-secondary/60 transition-colors",
                      !noMes && "text-muted-foreground",
                      selecionado && "bg-accent ring-1 ring-inset ring-primary"
                    )}
                  >
                    <span className={cn(
                      "h-6 w-6 flex items-center justify-center rounded-full text-xs font-semibold",
                      ehHoje && "bg-primary text-primary-foreground"
                    )}>
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {doDia.slice(0, 3).map((a) => (
                        <span key={a.id} className={cn("rounded px-1 py-0.5 text-[10px] font-semibold leading-tight truncate", statusChipClass[a.status])}>
                          {a.horaInicio} {a.pet?.nome}
                        </span>
                      ))}
                      {doDia.length > 3 && (
                        <span className="text-[10px] font-medium text-muted-foreground px-1">+{doDia.length - 3} mais</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold capitalize">
                  {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {diaSelecionado === hoje && <Badge variant="secondary" className="bg-accent text-primary">Hoje</Badge>}
              </div>

              {!agendamentosDoDia.length ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia</p>
                  <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Agendar</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {agendamentosDoDia.map((a) => (
                    <div key={a.id} className="border rounded-md p-2.5 space-y-2 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetalhe(a)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold min-w-10">{a.horaInicio}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.pet?.nome} <span className="text-muted-foreground text-xs">({a.tutor?.nome})</span></p>
                          <p className="text-[11px] text-muted-foreground truncate">{a.service?.nome} · {a.professional?.nome} · {formatCurrency(a.preco)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Select value={a.status} onValueChange={(v) => mudarStatus.mutate({ id: a.id, status: v })}>
                          <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setExcluindo(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : !agendamentosDoDia.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum agendamento para este dia</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {agendamentosDoDia.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetalhe(a)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-12">
                      <p className="text-sm font-bold">{a.horaInicio}</p>
                      <p className="text-xs text-muted-foreground">{a.horaFim}</p>
                    </div>
                    <div>
                      <p className="font-medium">{a.pet?.nome} <span className="text-muted-foreground text-sm">({a.tutor?.nome})</span></p>
                      <p className="text-xs text-muted-foreground">{a.service?.nome} · {a.professional?.nome} · {formatCurrency(a.preco)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select value={a.status} onValueChange={(v) => mudarStatus.mutate({ id: a.id, status: v })}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setExcluindo(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
