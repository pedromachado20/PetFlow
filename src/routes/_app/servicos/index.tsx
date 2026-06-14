import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Clock, DollarSign } from "lucide-react";
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
import { formatCurrency } from "~/lib/utils";

const getServicos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { services } = await import("~/db/schema");

  return db.query.services.findMany({
    where: and(eq(services.tenantId, tenantId), eq(services.ativo, true)),
    orderBy: (s, { asc }) => [asc(s.categoria), asc(s.nome)],
  });
});

const criarServico = createServerFn({ method: "POST" })
  .validator(z.object({
    nome: z.string().min(1),
    categoria: z.string(),
    preco: z.string(),
    duracao: z.number(),
    descricao: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { services } = await import("~/db/schema");

    await db.insert(services).values({
      id: crypto.randomUUID(),
      tenantId,
      ...data,
    });
  });

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.string().min(1),
  preco: z.string(),
  duracao: z.coerce.number().min(1),
  descricao: z.string().optional(),
});

const categorias = [
  { value: "banho_tosa", label: "Banho & Tosa" },
  { value: "consulta", label: "Consulta Veterinária" },
  { value: "vacina", label: "Vacinação" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame", label: "Exame" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "adestramento", label: "Adestramento" },
  { value: "outro", label: "Outro" },
];

export const Route = createFileRoute("/_app/servicos/")({
  component: ServicosPage,
});

function ServicosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => getServicos(),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarServico({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["servicos"] }); toast.success("Serviço criado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao criar serviço"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("nome")} placeholder="Ex: Banho Pequeno Porte" />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select onValueChange={(v) => setValue("categoria", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço (R$)</Label>
                  <Input {...register("preco")} placeholder="50.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Duração (min)</Label>
                  <Input type="number" {...register("duracao")} defaultValue={60} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input {...register("descricao")} placeholder="Opcional" />
              </div>
              <Button type="submit" className="w-full" disabled={criar.isPending}>
                {criar.isPending ? "Salvando..." : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum serviço cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}
                  </div>
                  <Badge variant="outline">{categorias.find((c) => c.value === s.categoria)?.label ?? s.categoria}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(s.preco)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duracao}min</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
