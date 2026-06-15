import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, PawPrint, Phone, Mail, Pencil, Trash2, Printer } from "lucide-react";
import { printTable } from "~/lib/pdf";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { ImageUpload } from "~/components/ui/image-upload";
import { toast } from "sonner";
import { formatPhone } from "~/lib/utils";

const getTutores = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { tutores, pets } = await import("~/db/schema");
  return db.query.tutores.findMany({
    where: and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true)),
    with: { pets: { where: eq(pets.ativo, true) } },
    orderBy: (t, { asc }) => [asc(t.nome)],
  });
});

const salvarTutor = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    nome: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    telefone: z.string().optional(),
    cpf: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    fotoUrl: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { tutores } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const payload = { ...data, email: data.email || undefined, fotoUrl: data.fotoUrl || undefined };
    if (data.id) {
      await db.update(tutores).set({ ...payload, updatedAt: new Date() }).where(and(eq(tutores.id, data.id), eq(tutores.tenantId, tenantId)));
    } else {
      await db.insert(tutores).values({ id: crypto.randomUUID(), tenantId, ...payload });
    }
  });

const excluirTutor = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { tutores } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(tutores).set({ ativo: false }).where(and(eq(tutores.id, data.id), eq(tutores.tenantId, tenantId)));
  });

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type Tutor = Awaited<ReturnType<typeof getTutores>>[number];

function Avatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string | null }) {
  if (fotoUrl) return <img src={fotoUrl} alt={nome} className="h-10 w-10 rounded-full object-cover shrink-0" />;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{nome.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export const Route = createFileRoute("/_app/tutores/")({
  component: TutoresPage,
});

function TutoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tutor | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["tutores"],
    queryFn: () => getTutores(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  function abrirNovo() {
    setEditando(null);
    setFoto(null);
    reset({ nome: "", email: "", telefone: "", cpf: "", cidade: "", estado: "" });
    setOpen(true);
  }

  function abrirEditar(t: Tutor) {
    setEditando(t);
    setFoto(t.fotoUrl ?? null);
    reset({ nome: t.nome, email: t.email ?? "", telefone: t.telefone ?? "", cpf: t.cpf ?? "", cidade: t.cidade ?? "", estado: t.estado ?? "" });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarTutor({ data: { ...values, id: editando?.id, fotoUrl: foto ?? undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tutores"] });
      toast.success(editando ? "Tutor atualizado" : "Tutor cadastrado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar tutor"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirTutor({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tutores"] });
      toast.success("Tutor removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover tutor"),
  });

  const filtrados = data.filter((t) =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.telefone?.includes(busca) ||
    t.email?.toLowerCase().includes(busca.toLowerCase())
  );

  function handlePrint() {
    printTable(
      "Tutores",
      ["Nome", "Telefone", "Email", "Cidade/UF", "Pets"],
      data.map((t) => [t.nome, t.telefone ?? "-", t.email ?? "-", t.cidade ? `${t.cidade}/${t.estado ?? ""}` : "-", t.pets?.length ?? 0])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar tutores..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data.length}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Tutor</Button>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar Tutor" : "Novo Tutor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} placeholder="Nome completo" />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...register("telefone")} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input {...register("cpf")} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register("email")} type="email" placeholder="email@exemplo.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input {...register("cidade")} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input {...register("estado")} maxLength={2} placeholder="SP" />
              </div>
            </div>
            <ImageUpload label="Foto do Tutor" value={foto} onChange={setFoto} />
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover tutor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O tutor e seus pets serão desativados. Esta ação pode ser desfeita manualmente no banco.</p>
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
      ) : !filtrados.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum tutor encontrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((t) => (
            <Card key={t.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar nome={t.nome} fotoUrl={t.fotoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.nome}</p>
                    {t.cidade && <p className="text-xs text-muted-foreground">{t.cidade}{t.estado ? ` - ${t.estado}` : ""}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <PawPrint className="h-3.5 w-3.5" />
                    {t.pets?.length ?? 0}
                  </div>
                </div>
                <div className="space-y-0.5">
                  {t.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {formatPhone(t.telefone)}
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> <span className="truncate">{t.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => abrirEditar(t)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-destructive hover:text-destructive" onClick={() => setExcluindo(t.id)}>
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
