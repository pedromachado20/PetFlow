import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Clock, DollarSign, Pencil, Trash2, Printer } from "lucide-react";
import { printTable } from "~/lib/pdf";
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

const salvarServico = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
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
    const { eq, and } = await import("drizzle-orm");
    if (data.id) {
      await db.update(services).set({ ...data, updatedAt: new Date() }).where(and(eq(services.id, data.id), eq(services.tenantId, tenantId)));
    } else {
      await db.insert(services).values({ id: crypto.randomUUID(), tenantId, ...data });
    }
  });

const excluirServico = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { services } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(services).set({ ativo: false }).where(and(eq(services.id, data.id), eq(services.tenantId, tenantId)));
  });

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.string().min(1),
  preco: z.string(),
  duracao: z.coerce.number().min(1),
  descricao: z.string().optional(),
});

const categorias = [
  { value: "banho_tosa",  label: "Banho & Tosa" },
  { value: "veterinaria", label: "Consulta Veterinária" },
  { value: "vacina",      label: "Vacinação" },
  { value: "cirurgia",    label: "Cirurgia" },
  { value: "exame",       label: "Exame" },
  { value: "hospedagem",  label: "Hospedagem" },
  { value: "adestramento",label: "Adestramento" },
  { value: "outro",       label: "Outro" },
];

type Servico = Awaited<ReturnType<typeof getServicos>>[number];

export const Route = createFileRoute("/_app/servicos/")({
  component: ServicosPage,
});

function ServicosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [catSel, setCatSel] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => getServicos(),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  function abrirNovo() {
    setEditando(null);
    setCatSel("");
    reset({ nome: "", categoria: "", preco: "", duracao: 60, descricao: "" });
    setOpen(true);
  }

  function abrirEditar(s: Servico) {
    setEditando(s);
    setCatSel(s.categoria);
    reset({ nome: s.nome, categoria: s.categoria, preco: s.preco ?? "", duracao: s.duracao, descricao: s.descricao ?? "" });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarServico({ data: { ...values, id: editando?.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"] });
      toast.success(editando ? "Serviço atualizado" : "Serviço criado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar serviço"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirServico({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover serviço"),
  });

  function handlePrint() {
    printTable(
      "Serviços",
      ["Nome", "Categoria", "Preço", "Duração (min)"],
      data.map((s) => [s.nome, categorias.find((c) => c.value === s.categoria)?.label ?? s.categoria, s.preco ?? "-", s.duracao])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data.length}>
          <Printer className="h-4 w-4" /> PDF
        </Button>
        <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Serviço</Button>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} placeholder="Ex: Banho Pequeno Porte" />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={catSel} onValueChange={(v) => { setCatSel(v); setValue("categoria", v); }}>
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
                <Input type="number" {...register("duracao")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input {...register("descricao")} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Serviço"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover serviço?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação desativa o serviço. Agendamentos existentes não são afetados.</p>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum serviço cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-muted-foreground truncate">{s.descricao}</p>}
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {categorias.find((c) => c.value === s.categoria)?.label ?? s.categoria}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(s.preco)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duracao}min</span>
                </div>
                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => abrirEditar(s)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-destructive hover:text-destructive" onClick={() => setExcluindo(s.id)}>
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
