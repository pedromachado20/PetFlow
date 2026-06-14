import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
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

const getPlanos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and, count } = await import("drizzle-orm");
  const { plans, assinaturas } = await import("~/db/schema");

  const lista = await db.query.plans.findMany({
    where: and(eq(plans.tenantId, tenantId), eq(plans.ativo, true)),
    with: { assinaturas: { where: eq(assinaturas.status, "ativa") } },
    orderBy: (p, { asc }) => [asc(p.preco)],
  });

  return lista;
});

const criarPlano = createServerFn({ method: "POST" })
  .validator(z.object({
    nome: z.string().min(1),
    tipo: z.string(),
    preco: z.string(),
    limite: z.coerce.number().optional(),
    descricao: z.string().optional(),
    cor: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { plans } = await import("~/db/schema");

    await db.insert(plans).values({
      id: crypto.randomUUID(),
      tenantId,
      nome: data.nome,
      tipo: data.tipo as any,
      preco: data.preco,
      limite: data.limite,
      descricao: data.descricao,
      cor: data.cor ?? "#0ea5e9",
    });
  });

const schema = z.object({
  nome: z.string().min(1),
  tipo: z.string().min(1),
  preco: z.string(),
  limite: z.coerce.number().optional(),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

export const Route = createFileRoute("/_app/planos/")({
  component: PlanosPage,
});

function PlanosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["planos"],
    queryFn: () => getPlanos(),
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm({ resolver: zodResolver(schema) });
  const tipoSelecionado = watch("tipo");

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarPlano({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planos"] }); toast.success("Plano criado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao criar plano"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Plano</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("nome")} placeholder="Ex: Plano Banho Mensal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select onValueChange={(v) => setValue("tipo", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ilimitado">Ilimitado</SelectItem>
                      <SelectItem value="limitado">Limitado</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {tipoSelecionado === "limitado" && (
                  <div className="space-y-1.5">
                    <Label>Limite (usos/mês)</Label>
                    <Input type="number" {...register("limite")} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço Mensal (R$)</Label>
                  <Input {...register("preco")} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <Input type="color" {...register("cor")} defaultValue="#0ea5e9" />
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum plano cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} style={{ borderColor: p.cor + "40" }}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.nome}</p>
                    {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                  </div>
                  <Badge variant="outline" style={{ color: p.cor }}>{p.tipo}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-lg">{formatCurrency(p.preco)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                  <span className="text-xs text-muted-foreground">{p.assinaturas?.length ?? 0} ativas</span>
                </div>
                {p.tipo === "limitado" && p.limite && (
                  <p className="text-xs text-muted-foreground">{p.limite} usos por mês</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
