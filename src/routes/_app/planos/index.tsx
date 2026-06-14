import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Printer } from "lucide-react";
import { printTable } from "~/lib/pdf";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "~/lib/utils";

const getPlanos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { plans, assinaturas } = await import("~/db/schema");
  return db.query.plans.findMany({
    where: and(eq(plans.tenantId, tenantId), eq(plans.ativo, true)),
    with: { assinaturas: { where: eq(assinaturas.status, "ativa") } },
    orderBy: (p, { asc }) => [asc(p.preco)],
  });
});

const salvarPlano = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
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
    const { eq, and } = await import("drizzle-orm");
    const payload = { nome: data.nome, tipo: data.tipo as any, preco: data.preco, limite: data.limite, descricao: data.descricao, cor: data.cor ?? "#0ea5e9" };
    if (data.id) {
      await db.update(plans).set({ ...payload, updatedAt: new Date() }).where(and(eq(plans.id, data.id), eq(plans.tenantId, tenantId)));
    } else {
      await db.insert(plans).values({ id: crypto.randomUUID(), tenantId, ...payload });
    }
  });

const excluirPlano = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { plans } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(plans).set({ ativo: false }).where(and(eq(plans.id, data.id), eq(plans.tenantId, tenantId)));
  });

const schema = z.object({
  nome: z.string().min(1),
  tipo: z.string().min(1),
  preco: z.string(),
  limite: z.coerce.number().optional(),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

type Plano = Awaited<ReturnType<typeof getPlanos>>[number];

export const Route = createFileRoute("/_app/planos/")({
  component: PlanosPage,
});

function PlanosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [tipoSel, setTipoSel] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["planos"],
    queryFn: () => getPlanos(),
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm({ resolver: zodResolver(schema) });
  const tipoWatch = watch("tipo");

  function abrirNovo() {
    setEditando(null);
    setTipoSel("");
    reset({ nome: "", tipo: "", preco: "", limite: undefined, descricao: "", cor: "#0ea5e9" });
    setOpen(true);
  }

  function abrirEditar(p: Plano) {
    setEditando(p);
    setTipoSel(p.tipo);
    reset({ nome: p.nome, tipo: p.tipo, preco: p.preco ?? "", limite: p.limite ?? undefined, descricao: p.descricao ?? "", cor: p.cor });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarPlano({ data: { ...values, id: editando?.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos"] });
      toast.success(editando ? "Plano atualizado" : "Plano criado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar plano"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirPlano({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos"] });
      toast.success("Plano removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover plano"),
  });

  function handlePrint() {
    printTable(
      "Planos",
      ["Nome", "Tipo", "Preço", "Assinantes Ativos", "Descrição"],
      data.map((p) => [p.nome, p.tipo, p.preco ?? "-", p.assinaturas?.length ?? 0, p.descricao ?? "-"])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data.length}>
          <Printer className="h-4 w-4" /> PDF
        </Button>
        <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Plano</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} placeholder="Ex: Plano Banho Mensal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={tipoSel} onValueChange={(v) => { setTipoSel(v); setValue("tipo", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ilimitado">Ilimitado</SelectItem>
                    <SelectItem value="limitado">Limitado</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(tipoSel === "limitado" || tipoWatch === "limitado") && (
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
                <Input type="color" {...register("cor")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input {...register("descricao")} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover plano?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O plano será desativado. Assinaturas existentes não são afetadas.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" disabled={excluir.isPending} onClick={() => excluir.mutate(excluindo!)}>
              {excluir.isPending ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.nome}</p>
                    {p.descricao && <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>}
                  </div>
                  <Badge variant="outline" style={{ color: p.cor }} className="ml-2 shrink-0">{p.tipo}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-lg">{formatCurrency(p.preco)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                  <span className="text-xs text-muted-foreground">{p.assinaturas?.length ?? 0} ativas</span>
                </div>
                {p.tipo === "limitado" && p.limite && (
                  <p className="text-xs text-muted-foreground">{p.limite} usos por mês</p>
                )}
                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => abrirEditar(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-destructive hover:text-destructive" onClick={() => setExcluindo(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
