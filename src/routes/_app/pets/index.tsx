import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Printer } from "lucide-react";
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
import { especieLabel, calcularIdadePet } from "~/lib/utils";

const getPets = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { pets, tutores } = await import("~/db/schema");
  const [lista, tutoresList] = await Promise.all([
    db.query.pets.findMany({
      where: and(eq(pets.tenantId, tenantId), eq(pets.ativo, true)),
      with: { tutor: true },
      orderBy: (p, { asc }) => [asc(p.nome)],
    }),
    db.query.tutores.findMany({ where: and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true)) }),
  ]);
  return { pets: lista, tutores: tutoresList };
});

const salvarPet = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    tutorId: z.string().min(1),
    nome: z.string().min(1),
    especie: z.string(),
    raca: z.string().optional(),
    sexo: z.string(),
    porte: z.string(),
    dataNascimento: z.string().optional(),
    castrado: z.boolean().optional(),
    observacoes: z.string().optional(),
    fotoUrl: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { pets } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const payload = {
      ...data,
      castrado: data.castrado ?? false,
      especie: data.especie as any,
      sexo: data.sexo as any,
      porte: data.porte as any,
      fotoUrl: data.fotoUrl || undefined,
    };
    if (data.id) {
      await db.update(pets).set({ ...payload, updatedAt: new Date() }).where(and(eq(pets.id, data.id), eq(pets.tenantId, tenantId)));
    } else {
      await db.insert(pets).values({ id: crypto.randomUUID(), tenantId, ...payload });
    }
  });

const excluirPet = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { pets } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(pets).set({ ativo: false }).where(and(eq(pets.id, data.id), eq(pets.tenantId, tenantId)));
  });

const schema = z.object({
  tutorId: z.string().min(1, "Selecione o tutor"),
  nome: z.string().min(1, "Nome obrigatório"),
  especie: z.string().min(1),
  raca: z.string().optional(),
  sexo: z.string().min(1),
  porte: z.string().min(1),
  dataNascimento: z.string().optional(),
  observacoes: z.string().optional(),
});

type Pet = Awaited<ReturnType<typeof getPets>>["pets"][number];

function PetAvatar({ nome, fotoUrl, especie }: { nome: string; fotoUrl?: string | null; especie: string }) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} className="h-20 w-20 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm">{especieLabel(especie).charAt(0)}</span>
    </div>
  );
}

export const Route = createFileRoute("/_app/pets/")({
  component: PetsPage,
});

function PetsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Pet | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const [foto, setFoto] = useState<string | null>(null);

  // Selects controlados
  const [tutorSel, setTutorSel] = useState("");
  const [especieSel, setEspecieSel] = useState("");
  const [sexoSel, setSexoSel] = useState("");
  const [porteSel, setPorteSel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => getPets(),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  function abrirNovo() {
    setEditando(null);
    setFoto(null);
    setTutorSel(""); setEspecieSel(""); setSexoSel(""); setPorteSel("");
    reset({ nome: "", raca: "", dataNascimento: "", observacoes: "" });
    setOpen(true);
  }

  function abrirEditar(p: Pet) {
    setEditando(p);
    setFoto(p.fotoUrl ?? null);
    setTutorSel(p.tutorId);   setValue("tutorId", p.tutorId);
    setEspecieSel(p.especie); setValue("especie", p.especie);
    setSexoSel(p.sexo);       setValue("sexo", p.sexo);
    setPorteSel(p.porte);     setValue("porte", p.porte);
    reset({
      tutorId: p.tutorId, nome: p.nome, especie: p.especie, raca: p.raca ?? "",
      sexo: p.sexo, porte: p.porte, dataNascimento: p.dataNascimento ?? "",
      observacoes: p.observacoes ?? "",
    });
    // reset sobrescreve os setValue acima para campos de texto, mas Selects precisam do state
    setTimeout(() => {
      setValue("tutorId", p.tutorId);
      setValue("especie", p.especie);
      setValue("sexo", p.sexo);
      setValue("porte", p.porte);
    }, 0);
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      salvarPet({ data: { ...values, id: editando?.id, fotoUrl: foto ?? undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success(editando ? "Pet atualizado" : "Pet cadastrado");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao salvar pet"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirPet({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Pet removido");
      setExcluindo(null);
    },
    onError: () => toast.error("Erro ao remover pet"),
  });

  const filtrados = (data?.pets ?? []).filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.raca?.toLowerCase().includes(busca.toLowerCase()) ||
    p.tutor?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const especieBadgeColor: Record<string, string> = { cachorro: "default", gato: "secondary", passaro: "outline" };

  function handlePrint() {
    printTable(
      "Pets",
      ["Nome", "Espécie", "Raça", "Tutor", "Sexo", "Porte"],
      (data?.pets ?? []).map((p) => [p.nome, especieLabel(p.especie), p.raca ?? "-", p.tutor?.nome ?? "-", p.sexo, p.porte])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar pets..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!(data?.pets.length)}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Pet</Button>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Pet" : "Novo Pet"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tutor *</Label>
              <Select value={tutorSel} onValueChange={(v) => { setTutorSel(v); setValue("tutorId", v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
                <SelectContent>
                  {data?.tutores.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.tutorId && <p className="text-xs text-destructive">{errors.tutorId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do Pet *</Label>
                <Input {...register("nome")} placeholder="Ex: Rex" />
              </div>
              <div className="space-y-1.5">
                <Label>Espécie *</Label>
                <Select value={especieSel} onValueChange={(v) => { setEspecieSel(v); setValue("especie", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["cachorro", "gato", "passaro", "peixe", "hamster", "coelho", "reptil", "outro"].map((e) => (
                      <SelectItem key={e} value={e}>{especieLabel(e)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Raça</Label>
                <Input {...register("raca")} placeholder="Ex: Labrador" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={sexoSel} onValueChange={(v) => { setSexoSel(v); setValue("sexo", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="femea">Fêmea</SelectItem>
                    <SelectItem value="nao_informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Porte *</Label>
                <Select value={porteSel} onValueChange={(v) => { setPorteSel(v); setValue("porte", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mini">Mini</SelectItem>
                    <SelectItem value="pequeno">Pequeno</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                    <SelectItem value="gigante">Gigante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input type="date" {...register("dataNascimento")} />
              </div>
            </div>
            <ImageUpload label="Foto do Pet" value={foto} onChange={setFoto} />
            <div className="space-y-1.5">
              <Label>Observações / Alergias</Label>
              <Input {...register("observacoes")} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover pet?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O pet será desativado. Histórico de vacinas e prontuários é mantido.</p>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum pet encontrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <Card key={p.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <PetAvatar nome={p.nome} fotoUrl={p.fotoUrl} especie={p.especie} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.tutor?.nome}</p>
                  </div>
                  <Badge variant={especieBadgeColor[p.especie] as any ?? "outline"} className="shrink-0">
                    {especieLabel(p.especie)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.raca && <span>{p.raca}</span>}
                  <span className="capitalize">{p.porte}</span>
                  {p.castrado && <span className="text-primary">Castrado</span>}
                  {p.dataNascimento && <span>{calcularIdadePet(p.dataNascimento)}</span>}
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
      )}
    </div>
  );
}
