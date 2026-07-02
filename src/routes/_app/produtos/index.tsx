import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Printer, Package } from "lucide-react";
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
import { ImageUpload } from "~/components/ui/image-upload";
import { toast } from "sonner";
import { formatCurrency } from "~/lib/utils";

/* ── server functions ─────────────────────────────────────────────────── */

const getProdutos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { produtos } = await import("~/db/schema");
  return db.query.produtos.findMany({
    where: and(eq(produtos.tenantId, tenantId), eq(produtos.ativo, true)),
    orderBy: (p, { asc }) => [asc(p.categoria), asc(p.nome)],
  });
});

const salvarProduto = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    nome: z.string().min(1),
    categoria: z.string().min(1),
    preco: z.string(),
    fotoUrl: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { produtos } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    if (data.id) {
      await db.update(produtos).set({ nome: data.nome, categoria: data.categoria, preco: data.preco, fotoUrl: data.fotoUrl, updatedAt: new Date() })
        .where(and(eq(produtos.id, data.id), eq(produtos.tenantId, tenantId)));
    } else {
      await db.insert(produtos).values({ id: crypto.randomUUID(), tenantId, ...data });
    }
  });

const excluirProduto = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { produtos } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(produtos).set({ ativo: false }).where(and(eq(produtos.id, data.id), eq(produtos.tenantId, tenantId)));
  });

/* ── constants ────────────────────────────────────────────────────────── */

const categorias = [
  { value: "alimento",     label: "Alimentos" },
  { value: "higiene",      label: "Higiene & Beleza" },
  { value: "acessorio",    label: "Acessórios" },
  { value: "medicamento",  label: "Medicamentos" },
  { value: "brinquedo",    label: "Brinquedos" },
  { value: "geral",        label: "Geral" },
];

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  preco: z.string().min(1, "Preço obrigatório"),
});

type Produto = Awaited<ReturnType<typeof getProdutos>>[number];

/* ── route ────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/_app/produtos/")({
  component: ProdutosPage,
});

function ProdutosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [catSel, setCatSel] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => getProdutos(),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  function abrirNovo() {
    setEditando(null);
    setCatSel("");
    setFoto(null);
    reset({ nome: "", categoria: "", preco: "" });
    setOpen(true);
  }

  function abrirEditar(p: Produto) {
    setEditando(p);
    setCatSel(p.categoria);
    setFoto(p.fotoUrl ?? null);
    reset({ nome: p.nome, categoria: p.categoria, preco: p.preco ?? "" });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarProduto({ data: { ...values, id: editando?.id, fotoUrl: foto ?? undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(editando ? "Produto atualizado" : "Produto criado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirProduto({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  function handlePrint() {
    printTable(
      "Produtos",
      ["Nome", "Categoria", "Preço"],
      data.map((p) => [
        p.nome,
        categorias.find((c) => c.value === p.categoria)?.label ?? p.categoria,
        formatCurrency(p.preco),
      ])
    );
  }

  const porCategoria = categorias
    .map((cat) => ({ ...cat, itens: data.filter((p) => p.categoria === cat.value) }))
    .filter((cat) => cat.itens.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data.length}>
          <Printer className="h-4 w-4" /> PDF
        </Button>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <ImageUpload label="Foto do Produto" value={foto} onChange={setFoto} />
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} placeholder="Ex: Ração Golden 15kg" />
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
              {errors.categoria && <p className="text-xs text-destructive">{errors.categoria.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input {...register("preco")} placeholder="0.00" />
              {errors.preco && <p className="text-xs text-destructive">{errors.preco.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover produto?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O produto será desativado e não aparecerá mais no caixa.</p>
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
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum produto cadastrado</p>
            <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Cadastrar produto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {porCategoria.map((cat) => (
            <div key={cat.value}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{cat.label}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.itens.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt={p.nome} className="h-12 w-12 rounded-md object-cover shrink-0 border border-border" />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary border border-border">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </span>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold truncate">{p.nome}</p>
                            <Badge variant="outline" className="shrink-0 text-xs">{cat.label}</Badge>
                          </div>
                          <p className="text-lg font-bold text-primary">{formatCurrency(p.preco)}</p>
                        </div>
                      </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
