import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
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
import { Switch } from "~/components/ui/switch";
import { ImageUpload } from "~/components/ui/image-upload";
import { toast } from "sonner";
import { especieLabel, calcularIdadePet } from "~/lib/utils";

// ─── Server functions ──────────────────────────────────────────────────────────

const getPetDetalhes = createServerFn({ method: "GET" })
  .validator(z.object({ petId: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { pets } = await import("~/db/schema");
    const pet = await db.query.pets.findFirst({
      where: and(eq(pets.id, data.petId), eq(pets.tenantId, tenantId)),
      with: { tutor: true },
    });
    if (!pet) throw new Error("Pet não encontrado");
    return pet;
  });

const getTutoresLista = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { tutores } = await import("~/db/schema");
  return db.query.tutores.findMany({
    where: and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true)),
    orderBy: (t, { asc }) => [asc(t.nome)],
  });
});

const getProfissionaisLista = createServerFn({ method: "GET" }).handler(async () => {
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

const salvarPetEdicao = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    tutorId: z.string().min(1),
    nome: z.string().min(1),
    especie: z.string(),
    raca: z.string().optional(),
    sexo: z.string(),
    porte: z.string(),
    dataNascimento: z.string().optional(),
    castrado: z.boolean().optional(),
    microchip: z.string().optional(),
    cor: z.string().optional(),
    peso: z.string().optional(),
    alergias: z.string().optional(),
    observacoes: z.string().optional(),
    fotoUrl: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { pets } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const { id, ...rest } = data;
    await db.update(pets).set({
      ...rest,
      castrado: rest.castrado ?? false,
      especie: rest.especie as any,
      sexo: rest.sexo as any,
      porte: rest.porte as any,
      fotoUrl: rest.fotoUrl || undefined,
      peso: rest.peso || undefined,
      updatedAt: new Date(),
    }).where(and(eq(pets.id, id), eq(pets.tenantId, tenantId)));
  });

const getProntuarios = createServerFn({ method: "GET" })
  .validator(z.object({ petId: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { prontuarios } = await import("~/db/schema");
    return db.query.prontuarios.findMany({
      where: and(eq(prontuarios.petId, data.petId), eq(prontuarios.tenantId, tenantId)),
      with: { profissional: true },
      orderBy: (p, { desc }) => [desc(p.dataConsulta)],
    });
  });

const salvarProntuario = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    petId: z.string(),
    profissionalId: z.string().optional(),
    dataConsulta: z.string().min(1),
    queixa: z.string().optional(),
    diagnostico: z.string().optional(),
    prescricao: z.string().optional(),
    peso: z.string().optional(),
    temperatura: z.string().optional(),
    observacoes: z.string().optional(),
    retorno: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { prontuarios } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const payload = {
      petId: data.petId,
      tenantId,
      profissionalId: data.profissionalId || null,
      dataConsulta: data.dataConsulta,
      queixa: data.queixa || null,
      diagnostico: data.diagnostico || null,
      prescricao: data.prescricao || null,
      peso: data.peso || null,
      temperatura: data.temperatura || null,
      observacoes: data.observacoes || null,
      retorno: data.retorno || null,
    };
    if (data.id) {
      await db.update(prontuarios)
        .set({ ...payload, updatedAt: new Date() })
        .where(and(eq(prontuarios.id, data.id), eq(prontuarios.tenantId, tenantId)));
    } else {
      await db.insert(prontuarios).values({ id: crypto.randomUUID(), ...payload });
    }
  });

const excluirProntuario = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { prontuarios } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.delete(prontuarios).where(and(eq(prontuarios.id, data.id), eq(prontuarios.tenantId, tenantId)));
  });

const getVacinas = createServerFn({ method: "GET" })
  .validator(z.object({ petId: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { vacinas } = await import("~/db/schema");
    return db.query.vacinas.findMany({
      where: and(eq(vacinas.petId, data.petId), eq(vacinas.tenantId, tenantId)),
      with: { profissional: true },
      orderBy: (v, { desc }) => [desc(v.dataAplicacao)],
    });
  });

const salvarVacina = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().optional(),
    petId: z.string(),
    profissionalId: z.string().optional(),
    tipo: z.string().min(1, "Tipo obrigatório"),
    fabricante: z.string().optional(),
    lote: z.string().optional(),
    dataAplicacao: z.string().min(1, "Data obrigatória"),
    proximaDose: z.string().optional(),
    observacoes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { vacinas } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const payload = {
      petId: data.petId,
      tenantId,
      profissionalId: data.profissionalId || null,
      tipo: data.tipo,
      fabricante: data.fabricante || null,
      lote: data.lote || null,
      dataAplicacao: data.dataAplicacao,
      proximaDose: data.proximaDose || null,
      observacoes: data.observacoes || null,
    };
    if (data.id) {
      await db.update(vacinas).set(payload)
        .where(and(eq(vacinas.id, data.id), eq(vacinas.tenantId, tenantId)));
    } else {
      await db.insert(vacinas).values({ id: crypto.randomUUID(), ...payload });
    }
  });

const excluirVacina = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { vacinas } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.delete(vacinas).where(and(eq(vacinas.id, data.id), eq(vacinas.tenantId, tenantId)));
  });

// ─── Types ─────────────────────────────────────────────────────────────────────

type PetDetalhes = Awaited<ReturnType<typeof getPetDetalhes>>;
type ProntuarioItem = Awaited<ReturnType<typeof getProntuarios>>[number];
type VacinaItem = Awaited<ReturnType<typeof getVacinas>>[number];
type ProfissionalItem = Awaited<ReturnType<typeof getProfissionaisLista>>[number];
type TutorItem = Awaited<ReturnType<typeof getTutoresLista>>[number];

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const petSchema = z.object({
  tutorId: z.string().min(1, "Selecione o tutor"),
  nome: z.string().min(1, "Nome obrigatório"),
  especie: z.string().min(1),
  raca: z.string().optional(),
  sexo: z.string().min(1),
  porte: z.string().min(1),
  dataNascimento: z.string().optional(),
  microchip: z.string().optional(),
  cor: z.string().optional(),
  peso: z.string().optional(),
  alergias: z.string().optional(),
  observacoes: z.string().optional(),
});

const prontuarioSchema = z.object({
  dataConsulta: z.string().min(1, "Data obrigatória"),
  profissionalId: z.string().optional(),
  queixa: z.string().optional(),
  diagnostico: z.string().optional(),
  prescricao: z.string().optional(),
  peso: z.string().optional(),
  temperatura: z.string().optional(),
  retorno: z.string().optional(),
  observacoes: z.string().optional(),
});

const vacinaSchema = z.object({
  tipo: z.string().min(1, "Tipo obrigatório"),
  profissionalId: z.string().optional(),
  fabricante: z.string().optional(),
  lote: z.string().optional(),
  dataAplicacao: z.string().min(1, "Data obrigatória"),
  proximaDose: z.string().optional(),
  observacoes: z.string().optional(),
});

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_app/pets/$petId")({
  component: PetDetalhePage,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function PetAvatar({ nome, fotoUrl, especie, size = "lg" }: { nome: string; fotoUrl?: string | null; especie: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  if (fotoUrl) return <img src={fotoUrl} alt={nome} className={`${cls} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${cls} rounded-full bg-primary/10 flex items-center justify-center shrink-0`}>
      <span className="text-lg">{especieLabel(especie).charAt(0)}</span>
    </div>
  );
}

type Tab = "dados" | "prontuarios" | "vacinas";

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "dados", label: "Dados" },
    { key: "prontuarios", label: "Prontuários" },
    { key: "vacinas", label: "Vacinas" },
  ];
  return (
    <div className="flex border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === t.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Dados ────────────────────────────────────────────────────────────────

function TabDados({
  pet,
  tutores,
  profissionais,
  onSaved,
}: {
  pet: PetDetalhes;
  tutores: TutorItem[];
  profissionais: ProfissionalItem[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [foto, setFoto] = useState<string | null>(pet.fotoUrl ?? null);
  const [castrado, setCastrado] = useState(pet.castrado);
  const [tutorSel, setTutorSel] = useState(pet.tutorId);
  const [especieSel, setEspecieSel] = useState(pet.especie);
  const [sexoSel, setSexoSel] = useState(pet.sexo);
  const [porteSel, setPorteSel] = useState(pet.porte);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(petSchema),
    defaultValues: {
      tutorId: pet.tutorId,
      nome: pet.nome,
      especie: pet.especie,
      raca: pet.raca ?? "",
      sexo: pet.sexo,
      porte: pet.porte,
      dataNascimento: pet.dataNascimento ?? "",
      microchip: pet.microchip ?? "",
      cor: pet.cor ?? "",
      peso: pet.peso ?? "",
      alergias: pet.alergias ?? "",
      observacoes: pet.observacoes ?? "",
    },
  });

  function abrirEditar() {
    setFoto(pet.fotoUrl ?? null);
    setCastrado(pet.castrado);
    setTutorSel(pet.tutorId); setValue("tutorId", pet.tutorId);
    setEspecieSel(pet.especie); setValue("especie", pet.especie);
    setSexoSel(pet.sexo); setValue("sexo", pet.sexo);
    setPorteSel(pet.porte); setValue("porte", pet.porte);
    reset({
      tutorId: pet.tutorId, nome: pet.nome, especie: pet.especie, raca: pet.raca ?? "",
      sexo: pet.sexo, porte: pet.porte, dataNascimento: pet.dataNascimento ?? "",
      microchip: pet.microchip ?? "", cor: pet.cor ?? "", peso: pet.peso ?? "",
      alergias: pet.alergias ?? "", observacoes: pet.observacoes ?? "",
    });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof petSchema>) =>
      salvarPetEdicao({ data: { ...values, id: pet.id, castrado, fotoUrl: foto ?? undefined } }),
    onSuccess: () => { toast.success("Pet atualizado"); setOpen(false); onSaved(); },
    onError: () => toast.error("Erro ao salvar pet"),
  });

  const campos: { label: string; value: string | null | undefined }[] = [
    { label: "Espécie", value: especieLabel(pet.especie) },
    { label: "Raça", value: pet.raca },
    { label: "Sexo", value: pet.sexo === "macho" ? "Macho" : pet.sexo === "femea" ? "Fêmea" : "Não informado" },
    { label: "Porte", value: pet.porte.charAt(0).toUpperCase() + pet.porte.slice(1) },
    { label: "Nascimento", value: pet.dataNascimento ? fmtDate(pet.dataNascimento) : undefined },
    { label: "Idade", value: pet.dataNascimento ? calcularIdadePet(pet.dataNascimento) : undefined },
    { label: "Peso", value: pet.peso ? `${pet.peso} kg` : undefined },
    { label: "Castrado", value: pet.castrado ? "Sim" : "Não" },
    { label: "Cor / Pelagem", value: pet.cor },
    { label: "Microchip", value: pet.microchip },
    { label: "Alergias", value: pet.alergias },
    { label: "Observações", value: pet.observacoes },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={abrirEditar}><Pencil className="h-4 w-4" /> Editar</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {campos.map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Pet</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tutor *</Label>
              <Select value={tutorSel} onValueChange={(v) => { setTutorSel(v); setValue("tutorId", v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
                <SelectContent>
                  {tutores.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.tutorId && <p className="text-xs text-destructive">{errors.tutorId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do Pet *</Label>
                <Input {...register("nome")} />
              </div>
              <div className="space-y-1.5">
                <Label>Espécie *</Label>
                <Select value={especieSel} onValueChange={(v) => { setEspecieSel(v); setValue("especie", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input {...register("raca")} />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={sexoSel} onValueChange={(v) => { setSexoSel(v); setValue("sexo", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mini", "pequeno", "medio", "grande", "gigante"].map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input type="date" {...register("dataNascimento")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.01" {...register("peso")} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor / Pelagem</Label>
                <Input {...register("cor")} placeholder="Ex: Caramelo" />
              </div>
              <div className="space-y-1.5">
                <Label>Microchip</Label>
                <Input {...register("microchip")} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={castrado} onCheckedChange={setCastrado} id="castrado" />
              <Label htmlFor="castrado">Castrado</Label>
            </div>
            <ImageUpload label="Foto do Pet" value={foto} onChange={setFoto} />
            <div className="space-y-1.5">
              <Label>Alergias</Label>
              <Input {...register("alergias")} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input {...register("observacoes")} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Tab: Prontuários ──────────────────────────────────────────────────────────

function TabProntuarios({
  petId,
  prontuarios,
  profissionais,
  onSaved,
}: {
  petId: string;
  prontuarios: ProntuarioItem[];
  profissionais: ProfissionalItem[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<ProntuarioItem | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [profSel, setProfSel] = useState("");

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(prontuarioSchema),
  });

  function abrirNovo() {
    setEditando(null);
    setProfSel("");
    reset({ dataConsulta: new Date().toISOString().split("T")[0], profissionalId: "", queixa: "", diagnostico: "", prescricao: "", peso: "", temperatura: "", retorno: "", observacoes: "" });
    setOpen(true);
  }

  function abrirEditar(p: ProntuarioItem) {
    setEditando(p);
    const prof = p.profissionalId ?? "";
    setProfSel(prof);
    reset({
      dataConsulta: p.dataConsulta,
      profissionalId: prof,
      queixa: p.queixa ?? "",
      diagnostico: p.diagnostico ?? "",
      prescricao: p.prescricao ?? "",
      peso: p.peso ?? "",
      temperatura: p.temperatura ?? "",
      retorno: p.retorno ?? "",
      observacoes: p.observacoes ?? "",
    });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof prontuarioSchema>) =>
      salvarProntuario({ data: { ...values, petId, id: editando?.id } }),
    onSuccess: () => { toast.success(editando ? "Prontuário atualizado" : "Prontuário registrado"); setOpen(false); onSaved(); },
    onError: () => toast.error("Erro ao salvar prontuário"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirProntuario({ data: { id } }),
    onSuccess: () => { toast.success("Prontuário removido"); setExcluindo(null); onSaved(); },
    onError: () => toast.error("Erro ao remover prontuário"),
  });

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Prontuário</Button>
      </div>

      {prontuarios.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum prontuário registrado</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {prontuarios.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{fmtDate(p.dataConsulta)}</p>
                    {p.profissional && (
                      <p className="text-xs text-muted-foreground">Dr(a). {p.profissional.nome}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEditar(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setExcluindo(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {p.peso && <div><span className="text-muted-foreground text-xs">Peso: </span>{p.peso} kg</div>}
                  {p.temperatura && <div><span className="text-muted-foreground text-xs">Temp.: </span>{p.temperatura}°C</div>}
                </div>

                {p.queixa && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Queixa</p>
                    <p className="text-sm">{p.queixa}</p>
                  </div>
                )}
                {p.diagnostico && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diagnóstico</p>
                    <p className="text-sm">{p.diagnostico}</p>
                  </div>
                )}
                {p.prescricao && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prescrição</p>
                    <p className="text-sm">{p.prescricao}</p>
                  </div>
                )}
                {p.observacoes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
                    <p className="text-sm">{p.observacoes}</p>
                  </div>
                )}
                {p.retorno && (
                  <div className="pt-1 border-t border-border">
                    <Badge variant="outline" className="text-xs">Retorno: {fmtDate(p.retorno)}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Prontuário" : "Novo Prontuário"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data da Consulta *</Label>
                <Input type="date" {...register("dataConsulta")} />
                {errors.dataConsulta && <p className="text-xs text-destructive">{errors.dataConsulta.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Veterinário</Label>
                <Select value={profSel} onValueChange={(v) => { setProfSel(v); setValue("profissionalId", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("peso")} />
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura (°C)</Label>
                <Input type="number" step="0.1" placeholder="38.5" {...register("temperatura")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Queixa principal</Label>
              <textarea
                {...register("queixa")}
                rows={2}
                placeholder="Motivo da consulta..."
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnóstico</Label>
              <textarea
                {...register("diagnostico")}
                rows={2}
                placeholder="Diagnóstico clínico..."
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prescrição / Tratamento</Label>
              <textarea
                {...register("prescricao")}
                rows={2}
                placeholder="Medicamentos, dosagens, orientações..."
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <textarea
                {...register("observacoes")}
                rows={2}
                placeholder="Outras anotações..."
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Retorno</Label>
              <Input type="date" {...register("retorno")} />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Registrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover prontuário?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" disabled={excluir.isPending} onClick={() => excluir.mutate(excluindo!)}>
              {excluir.isPending ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Tab: Vacinas ──────────────────────────────────────────────────────────────

function TabVacinas({
  petId,
  vacinas,
  profissionais,
  onSaved,
}: {
  petId: string;
  vacinas: VacinaItem[];
  profissionais: ProfissionalItem[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<VacinaItem | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [profSel, setProfSel] = useState("");

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vacinaSchema),
  });

  function abrirNova() {
    setEditando(null);
    setProfSel("");
    reset({ tipo: "", profissionalId: "", fabricante: "", lote: "", dataAplicacao: new Date().toISOString().split("T")[0], proximaDose: "", observacoes: "" });
    setOpen(true);
  }

  function abrirEditar(v: VacinaItem) {
    setEditando(v);
    const prof = v.profissionalId ?? "";
    setProfSel(prof);
    reset({
      tipo: v.tipo,
      profissionalId: prof,
      fabricante: v.fabricante ?? "",
      lote: v.lote ?? "",
      dataAplicacao: v.dataAplicacao,
      proximaDose: v.proximaDose ?? "",
      observacoes: v.observacoes ?? "",
    });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: (values: z.infer<typeof vacinaSchema>) =>
      salvarVacina({ data: { ...values, petId, id: editando?.id } }),
    onSuccess: () => { toast.success(editando ? "Vacina atualizada" : "Vacina registrada"); setOpen(false); onSaved(); },
    onError: () => toast.error("Erro ao salvar vacina"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirVacina({ data: { id } }),
    onSuccess: () => { toast.success("Vacina removida"); setExcluindo(null); onSaved(); },
    onError: () => toast.error("Erro ao remover vacina"),
  });

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirNova}><Plus className="h-4 w-4" /> Nova Vacina</Button>
      </div>

      {vacinas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma vacina registrada</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {vacinas.map((v) => {
            const vencida = v.proximaDose && v.proximaDose < hoje;
            return (
              <Card key={v.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{v.tipo}</p>
                        {vencida && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
                        {!vencida && v.proximaDose && <Badge variant="secondary" className="text-xs">Em dia</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Aplicada: {fmtDate(v.dataAplicacao)}</span>
                        {v.proximaDose && <span>Próxima dose: {fmtDate(v.proximaDose)}</span>}
                        {v.fabricante && <span>{v.fabricante}{v.lote ? ` – Lote: ${v.lote}` : ""}</span>}
                        {v.profissional && <span>Dr(a). {v.profissional.nome}</span>}
                      </div>
                      {v.observacoes && <p className="text-xs text-muted-foreground">{v.observacoes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEditar(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setExcluindo(v.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Vacina" : "Nova Vacina"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => salvar.mutate(v))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo de Vacina *</Label>
              <Input {...register("tipo")} placeholder="Ex: Antirrábica, V10, Giárdia..." />
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Veterinário</Label>
              <Select value={profSel} onValueChange={(v) => { setProfSel(v); setValue("profissionalId", v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de Aplicação *</Label>
                <Input type="date" {...register("dataAplicacao")} />
                {errors.dataAplicacao && <p className="text-xs text-destructive">{errors.dataAplicacao.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Próxima Dose</Label>
                <Input type="date" {...register("proximaDose")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Input {...register("fabricante")} placeholder="Ex: MSD" />
              </div>
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Input {...register("lote")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input {...register("observacoes")} placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Registrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover vacina?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" disabled={excluir.isPending} onClick={() => excluir.mutate(excluindo!)}>
              {excluir.isPending ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function PetDetalhePage() {
  const { petId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("dados");
  const qc = useQueryClient();

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => getPetDetalhes({ data: { petId } }),
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: () => getProfissionaisLista(),
  });

  const { data: tutores = [] } = useQuery({
    queryKey: ["tutores"],
    queryFn: () => getTutoresLista(),
    enabled: tab === "dados",
  });

  const { data: prontuarios = [] } = useQuery({
    queryKey: ["prontuarios", petId],
    queryFn: () => getProntuarios({ data: { petId } }),
    enabled: tab === "prontuarios",
  });

  const { data: vacinas = [] } = useQuery({
    queryKey: ["vacinas", petId],
    queryFn: () => getVacinas({ data: { petId } }),
    enabled: tab === "vacinas",
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!pet) return <p className="text-sm text-destructive">Pet não encontrado</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/_app/pets/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para Pets
      </Link>

      {/* Pet header */}
      <div className="flex items-center gap-4">
        <PetAvatar nome={pet.nome} fotoUrl={pet.fotoUrl} especie={pet.especie} />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{pet.nome}</h1>
          <p className="text-sm text-muted-foreground">{pet.tutor?.nome}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>{especieLabel(pet.especie)}</Badge>
            {pet.castrado && <Badge variant="secondary">Castrado</Badge>}
            {pet.dataNascimento && <Badge variant="outline">{calcularIdadePet(pet.dataNascimento)}</Badge>}
          </div>
        </div>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {tab === "dados" && (
        <TabDados
          pet={pet}
          tutores={tutores}
          profissionais={profissionais}
          onSaved={() => qc.invalidateQueries({ queryKey: ["pet", petId] })}
        />
      )}
      {tab === "prontuarios" && (
        <TabProntuarios
          petId={petId}
          prontuarios={prontuarios}
          profissionais={profissionais}
          onSaved={() => qc.invalidateQueries({ queryKey: ["prontuarios", petId] })}
        />
      )}
      {tab === "vacinas" && (
        <TabVacinas
          petId={petId}
          vacinas={vacinas}
          profissionais={profissionais}
          onSaved={() => qc.invalidateQueries({ queryKey: ["vacinas", petId] })}
        />
      )}
    </div>
  );
}
