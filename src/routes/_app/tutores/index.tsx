import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, PawPrint, Phone, Mail } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { toast } from "sonner";
import { formatPhone } from "~/lib/utils";

const getTutores = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and, count } = await import("drizzle-orm");
  const { tutores, pets } = await import("~/db/schema");

  const lista = await db.query.tutores.findMany({
    where: and(eq(tutores.tenantId, tenantId), eq(tutores.ativo, true)),
    with: { pets: { where: eq(pets.ativo, true) } },
    orderBy: (t, { asc }) => [asc(t.nome)],
  });

  return lista;
});

const criarTutor = createServerFn({ method: "POST" })
  .validator(z.object({
    nome: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    telefone: z.string().optional(),
    cpf: z.string().optional(),
    endereco: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { tutores } = await import("~/db/schema");

    await db.insert(tutores).values({
      id: crypto.randomUUID(),
      tenantId,
      ...data,
      email: data.email || undefined,
    });
  });

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

export const Route = createFileRoute("/_app/tutores/")({
  component: TutoresPage,
});

function TutoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["tutores"],
    queryFn: () => getTutores(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => criarTutor({ data: values }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tutores"] }); toast.success("Tutor cadastrado"); setOpen(false); reset(); },
    onError: () => toast.error("Erro ao cadastrar tutor"),
  });

  const filtrados = data.filter((t) =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.telefone?.includes(busca) ||
    t.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar tutores..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Tutor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Tutor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} className="space-y-3">
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum tutor encontrado</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((t) => (
            <Card key={t.id} className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.nome}</p>
                    {t.cidade && <p className="text-xs text-muted-foreground">{t.cidade}{t.estado ? ` - ${t.estado}` : ""}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <PawPrint className="h-3.5 w-3.5" />
                    {t.pets?.length ?? 0} {t.pets?.length === 1 ? "pet" : "pets"}
                  </div>
                </div>
                <div className="space-y-1">
                  {t.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {formatPhone(t.telefone)}
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {t.email}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
