import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "~/lib/utils";

const getAgenda = createServerFn({ method: "GET" })
  .validator(z.object({ data: z.string() }))
  .handler(async ({ data: { data } }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { appointments, pets: petsSchema, tutores: tutoresSchema, professionals, services } = await import("~/db/schema");

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

const criarAgendamento = createServerFn({ method: "POST" })
  .validator(z.object({
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
    const { eq } = await import("drizzle-orm");

    const pet = await db.query.pets.findFirst({ where: eq(pets.id, data.petId) });
    const service = await db.query.services.findFirst({ where: eq(services.id, data.serviceId) });

    await db.insert(appointments).values({
      id: crypto.randomUUID(),
      tenantId,
      tutorId: pet!.tutorId,
      petId: data.petId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      data: data.data,
      horaInicio: data.horaInicio,
      horaFim: data.horaFim,
      preco: service?.preco ?? "0",
      observacoes: data.observacoes,
    });
  });

const alterarStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { appointments } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");

    await db.update(appointments)
      .set({ status: data.status as any })
      .where(and(eq(appointments.id, data.id), eq(appointments.tenantId, tenantId)));
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
  agendado: "secondary",
  confirmado: "outline",
  em_atendimento: "warning",
  concluido: "success",
  cancelado: "destructive",
  faltou: "destructive",
};

export const Route = createFileRoute("/_app/agenda/")({
  component: AgendaPage,
});

function AgendaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dataAtual, setDataAtual] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["agenda", dataAtual],
    queryFn: () => getAgenda({ data: { data: dataAtual } }),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarAgendamento({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Agendamento criado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao criar agendamento"),
  });

  const mudarStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => alterarStatus({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Status atualizado"); },
  });

  function mudarDia(delta: number) {
    const d = new Date(dataAtual + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDataAtual(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium">{new Date(dataAtual + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
          <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDataAtual(new Date().toISOString().slice(0, 10))}>Hoje</Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Agendar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Pet</Label>
                <Select onValueChange={(v) => setValue("petId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                  <SelectContent>
                    {data?.pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tutor?.nome})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Profissional</Label>
                <Select onValueChange={(v) => setValue("professionalId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {data?.profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Serviço</Label>
                <Select onValueChange={(v) => setValue("serviceId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {data?.servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome} — {formatCurrency(s.preco)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-1">
                  <Label>Data</Label>
                  <Input type="date" defaultValue={dataAtual} {...register("data")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Início</Label>
                  <Input type="time" {...register("horaInicio")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim</Label>
                  <Input type="time" {...register("horaFim")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input {...register("observacoes")} placeholder="Opcional" />
              </div>
              <Button type="submit" className="w-full" disabled={criar.isPending}>
                {criar.isPending ? "Salvando..." : "Agendar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data?.agendamentos.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum agendamento para este dia</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.agendamentos.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between py-4 px-4">
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
                <div className="flex items-center gap-2">
                  <Badge variant={statusColors[a.status] as any}>{a.status.replace("_", " ")}</Badge>
                  <Select value={a.status} onValueChange={(v) => mudarStatus.mutate({ id: a.id, status: v })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "faltou"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
