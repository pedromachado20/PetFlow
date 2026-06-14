import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Phone } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { formatPhone } from "~/lib/utils";

const getProfissionais = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { professionals } = await import("~/db/schema");

  return db.query.professionals.findMany({
    where: and(eq(professionals.tenantId, tenantId), eq(professionals.ativo, true)),
    orderBy: (p, { asc }) => [asc(p.nome)],
  });
});

const criarProfissional = createServerFn({ method: "POST" })
  .validator(z.object({
    nome: z.string().min(2),
    especialidade: z.string(),
    telefone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    crmv: z.string().optional(),
    comissao: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { professionals } = await import("~/db/schema");

    await db.insert(professionals).values({
      id: crypto.randomUUID(),
      tenantId,
      ...data,
      especialidade: data.especialidade as any,
      email: data.email || undefined,
    });
  });

const schema = z.object({
  nome: z.string().min(2),
  especialidade: z.string().min(1),
  telefone: z.string().optional(),
  email: z.string().optional(),
  crmv: z.string().optional(),
  comissao: z.string().optional(),
});

const especialidades = [
  { value: "veterinario", label: "Veterinário" },
  { value: "tosador", label: "Tosador" },
  { value: "banhista", label: "Banhista" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "recepcao", label: "Recepção" },
];

export const Route = createFileRoute("/_app/profissionais/")({
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["profissionais"],
    queryFn: () => getProfissionais(),
  });

  const { register, handleSubmit, setValue, reset } = useForm({ resolver: zodResolver(schema) });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarProfissional({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profissionais"] }); toast.success("Profissional cadastrado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao cadastrar profissional"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Profissional</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Profissional</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("nome")} />
              </div>
              <div className="space-y-1.5">
                <Label>Especialidade *</Label>
                <Select onValueChange={(v) => setValue("especialidade", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {especialidades.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input {...register("telefone")} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label>CRMV</Label>
                  <Input {...register("crmv")} placeholder="Somente vet." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Comissão (%)</Label>
                  <Input {...register("comissao")} placeholder="0" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={criar.isPending}>
                {criar.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum profissional cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-semibold">{p.nome}</p>
                  <Badge variant="outline">{especialidades.find((e) => e.value === p.especialidade)?.label ?? p.especialidade}</Badge>
                </div>
                {p.telefone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {formatPhone(p.telefone)}
                  </div>
                )}
                {p.crmv && <p className="text-xs text-muted-foreground">CRMV: {p.crmv}</p>}
                {p.comissao && parseFloat(p.comissao) > 0 && (
                  <p className="text-xs text-muted-foreground">Comissão: {p.comissao}%</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
