import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Phone, Pencil, Trash2, Printer } from "lucide-react";
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

const salvarProfissional = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    nome: z.string().min(2),
    especialidade: z.string(),
    telefone: z.string().optional(),
    email: z.string().optional(),
    crmv: z.string().optional(),
    comissao: z.string().optional(),
    fotoUrl: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { professionals } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const payload = { ...data, especialidade: data.especialidade as any, email: data.email || undefined, fotoUrl: data.fotoUrl || undefined };
    if (data.id) {
      await db.update(professionals).set({ ...payload, updatedAt: new Date() }).where(and(eq(professionals.id, data.id), eq(professionals.tenantId, tenantId)));
    } else {
      await db.insert(professionals).values({ id: crypto.randomUUID(), tenantId, ...payload });
    }
  });

const excluirProfissional = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { professionals } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(professionals).set({ ativo: false }).where(and(eq(professionals.id, data.id), eq(professionals.tenantId, tenantId)));
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
  { value: "tosador",     label: "Tosador" },
  { value: "banhista",    label: "Banhista" },
  { value: "auxiliar",    label: "Auxiliar" },
  { value: "recepcao",    label: "Recepção" },
];

type Profissional = Awaited<ReturnType<typeof getProfissionais>>[number];

function Avatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string | null }) {
  if (fotoUrl) return <img src={fotoUrl} alt={nome} className="h-10 w-10 rounded-full object-cover shrink-0" />;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{nome.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export const Route = createFileRoute("/_app/profissionais/")({
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [espSel, setEspSel] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["profissionais"],
    queryFn: () => getProfissionais(),
  });

  const { register, handleSubmit, setValue, reset } = useForm({ resolver: zodResolver(schema) });

  function abrirNovo() {
    setEditando(null);
    setEspSel("");
    setFoto(null);
    reset({ nome: "", especialidade: "", telefone: "", email: "", crmv: "", comissao: "" });
    setOpen(true);
  }

  function abrirEditar(p: Profissional) {
    setEditando(p);
    setEspSel(p.especialidade);
    setFoto(p.fotoUrl ?? null);
    reset({ nome: p.nome, especialidade: p.especialidade, telefone: p.telefone ?? "", email: p.email ?? "", crmv: p.crmv ?? "", comissao: p.comissao ?? "" });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarProfissional({ data: { ...values, id: editando?.id, fotoUrl: foto ?? undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profissionais"] });
      toast.success(editando ? "Profissional atualizado" : "Profissional cadastrado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar profissional"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirProfissional({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profissionais"] });
      toast.success("Profissional removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover profissional"),
  });

  function handlePrint() {
    printTable(
      "Profissionais",
      ["Nome", "Especialidade", "Telefone", "Email", "CRMV", "Comissão (%)"],
      data.map((p) => [p.nome, especialidades.find((e) => e.value === p.especialidade)?.label ?? p.especialidade, p.telefone ?? "-", p.email ?? "-", p.crmv ?? "-", p.comissao ?? "-"])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data.length}>
          <Printer className="h-4 w-4" /> PDF
        </Button>
        <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Profissional</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar Profissional" : "Novo Profissional"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} />
            </div>
            <div className="space-y-1.5">
              <Label>Especialidade *</Label>
              <Select value={espSel} onValueChange={(v) => { setEspSel(v); setValue("especialidade", v); }}>
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
            <ImageUpload label="Foto do Profissional" value={foto} onChange={setFoto} />
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover profissional?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O profissional será desativado e não aparecerá mais na agenda.</p>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum profissional cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} fotoUrl={p.fotoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <Badge variant="outline" className="text-xs">{especialidades.find((e) => e.value === p.especialidade)?.label ?? p.especialidade}</Badge>
                  </div>
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
