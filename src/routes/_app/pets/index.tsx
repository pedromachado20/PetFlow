import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, PawPrint, Syringe, FileText } from "lucide-react";
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

const criarPet = createServerFn({ method: "POST" })
  .validator(z.object({
    tutorId: z.string().min(1),
    nome: z.string().min(1),
    especie: z.string(),
    raca: z.string().optional(),
    sexo: z.string(),
    porte: z.string(),
    dataNascimento: z.string().optional(),
    castrado: z.boolean().optional(),
    observacoes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { pets } = await import("~/db/schema");

    await db.insert(pets).values({
      id: crypto.randomUUID(),
      tenantId,
      ...data,
      castrado: data.castrado ?? false,
      especie: data.especie as any,
      sexo: data.sexo as any,
      porte: data.porte as any,
    });
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

const especieBadgeColor: Record<string, string> = {
  cachorro: "default",
  gato: "secondary",
  passaro: "outline",
};

export const Route = createFileRoute("/_app/pets/")({
  component: PetsPage,
});

function PetsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => getPets(),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarPet({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pets"] }); toast.success("Pet cadastrado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao cadastrar pet"),
  });

  const filtrados = (data?.pets ?? []).filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.raca?.toLowerCase().includes(busca.toLowerCase()) ||
    p.tutor?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar pets..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Pet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Pet</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tutor *</Label>
                <Select onValueChange={(v) => setValue("tutorId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
                  <SelectContent>
                    {data?.tutores.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
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
                  <Select onValueChange={(v) => setValue("especie", v)}>
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
                  <Select onValueChange={(v) => setValue("sexo", v)}>
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
                  <Select onValueChange={(v) => setValue("porte", v)}>
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
              <div className="space-y-1.5">
                <Label>Observações / Alergias</Label>
                <Input {...register("observacoes")} placeholder="Opcional" />
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
      ) : !filtrados.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum pet encontrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <Card key={p.id} className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.tutor?.nome}</p>
                  </div>
                  <Badge variant={especieBadgeColor[p.especie] as any ?? "outline"}>
                    {especieLabel(p.especie)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.raca && <span>{p.raca}</span>}
                  <span className="capitalize">{p.porte}</span>
                  {p.castrado && <span className="text-primary">Castrado</span>}
                  {p.dataNascimento && <span>{calcularIdadePet(p.dataNascimento)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
