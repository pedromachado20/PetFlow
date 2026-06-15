import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Printer, Info } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "~/lib/utils";
import { printTable } from "~/lib/pdf";

const getAgenda = createServerFn({ method: "GET" })
  .validator(z.object({ data: z.string() }))
  .handler(async ({ data: { data } }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { appointments, pets: petsSchema, professionals, services } = await import("~/db/schema");

    const [agendamentos, profissionais, petsLista, servicos] = await Promise.all([
      db.query.appointments.findMany({
        where: and(eq(appointments.tenantId, tenantId), eq(appointments.data, data)),
        with: { pet: true, tutor: true, professional: true, service: true },
        orderBy: (a, { asc }) => [asc(a.horaInicio)],
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
    const { appointments, pets, services } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const pet = await db.query.pets.findFirst({ where: eq(pets.id, data.petId) });
    const service = await db.query.services.findFirst({ where: eq(services.id, data.serviceId) });

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

const schema = z.object({
  petId: z.string().min(1),
  professionalId: z.string().min(1),
  serviceId: z.string().min(1),
  data: z.string().min(1),
  horaInicio: z.string().min(1),
  horaFim: z.string().min(1),
  observacoes: z.string().optional(),
});

const statusColors: Record<string, string> = {
  agendado: "secondary", confirmado: "outline", em_atendimento: "warning",
  concluido: "success", cancelado: "destructive", faltou: "destructive",
};

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
  const [dataAtual, setDataAtual] = useState(() => new Date().toISOString().slice(0, 10));

  const [petSel, setPetSel] = useState("");
  const [proSel, setProSel] = useState("");
  const [svcSel, setSvcSel] = useState("");
  const [dataSel, setDataSel] = useState(dataAtual);
  const [horaInicioSel, setHoraInicioSel] = useState("");
  const [horaFimSel, setHoraFimSel] = useState("");
  const [obsVal, setObsVal] = useState("");

  function abrirNovo() {
    setEditando(null);
    setPetSel(""); setProSel(""); setSvcSel("");
    setDataSel(dataAtual); setHoraInicioSel(""); setHoraFimSel(""); setObsVal("");
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
    const d = new Date(dataAtual + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDataAtual(d.toISOString().slice(0, 10));
  }

  function handlePrint() {
    const rows = (data?.agendamentos ?? []).map((a) => [
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
      new Date(dataAtual + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium">
            {new Date(dataAtual + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDataAtual(new Date().toISOString().slice(0, 10))}>Hoje</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data?.agendamentos.length}>
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
      ) : !data?.agendamentos.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum agendamento para este dia</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.agendamentos.map((a) => (
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
                        {["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "faltou"].map((s) => (
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
