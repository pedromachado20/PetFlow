import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";

const getConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq } = await import("drizzle-orm");
  const { tenants } = await import("~/db/schema");

  return db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
});

const salvarDados = createServerFn({ method: "POST" })
  .validator(z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional(),
    endereco: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cnpj: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  });

const salvarWhatsapp = createServerFn({ method: "POST" })
  .validator(z.object({
    whatsappAtivo: z.boolean(),
    whatsappProvider: z.string(),
    evolutionApiUrl: z.string().optional(),
    evolutionApiKey: z.string().optional(),
    evolutionInstance: z.string().optional(),
    zapiClientToken: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  });

const salvarNotificacoes = createServerFn({ method: "POST" })
  .validator(z.object({
    notifAgendamento: z.boolean(),
    notifConfirmacao: z.boolean(),
    notifLembrete: z.boolean(),
    notifBemVindo: z.boolean(),
    notifVacina: z.boolean(),
    notifVencimento: z.boolean(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");
    await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  });

const schemaDados = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cnpj: z.string().optional(),
});

export const Route = createFileRoute("/_app/configuracoes/")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: () => getConfig(),
  });

  // --- Dados do pet shop ---
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schemaDados),
    values: data ? {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone ?? "",
      endereco: data.endereco ?? "",
      cidade: data.cidade ?? "",
      estado: data.estado ?? "",
      cnpj: data.cnpj ?? "",
    } : undefined,
  });

  const salvarDadosMut = useMutation({
    mutationFn: (v: z.infer<typeof schemaDados>) => salvarDados({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("Dados salvos"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  // --- WhatsApp ---
  const [provider, setProvider] = useState(data?.whatsappProvider ?? "nenhum");
  const [whatsappAtivo, setWhatsappAtivo] = useState(data?.whatsappAtivo ?? false);
  const [evolutionUrl, setEvolutionUrl] = useState(data?.evolutionApiUrl ?? "");
  const [evolutionKey, setEvolutionKey] = useState(data?.evolutionApiKey ?? "");
  const [evolutionInstance, setEvolutionInstance] = useState(data?.evolutionInstance ?? "");
  const [zapiToken, setZapiToken] = useState(data?.zapiClientToken ?? "");

  const salvarWppMut = useMutation({
    mutationFn: () => salvarWhatsapp({
      data: {
        whatsappAtivo,
        whatsappProvider: provider,
        evolutionApiUrl: evolutionUrl || undefined,
        evolutionApiKey: evolutionKey || undefined,
        evolutionInstance: evolutionInstance || undefined,
        zapiClientToken: zapiToken || undefined,
      },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("WhatsApp salvo"); },
    onError: () => toast.error("Erro ao salvar WhatsApp"),
  });

  // --- Notificações ---
  const [notifs, setNotifs] = useState({
    notifAgendamento: data?.notifAgendamento ?? false,
    notifConfirmacao: data?.notifConfirmacao ?? false,
    notifLembrete: data?.notifLembrete ?? false,
    notifBemVindo: data?.notifBemVindo ?? false,
    notifVacina: data?.notifVacina ?? false,
    notifVencimento: data?.notifVencimento ?? false,
  });

  const salvarNotifMut = useMutation({
    mutationFn: () => salvarNotificacoes({ data: notifs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("Notificações salvas"); },
    onError: () => toast.error("Erro ao salvar notificações"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-xl space-y-6">
      {/* Dados do Pet Shop */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Pet Shop / Clínica</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => salvarDadosMut.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register("nome")} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input {...register("email")} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...register("telefone")} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input {...register("cnpj")} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input {...register("endereco")} />
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
            <Button type="submit" disabled={salvarDadosMut.isPending}>
              {salvarDadosMut.isPending ? "Salvando..." : "Salvar Dados"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp</CardTitle>
          <CardDescription>Configure a integração para envio de mensagens automáticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar WhatsApp</Label>
            <Switch checked={whatsappAtivo} onCheckedChange={setWhatsappAtivo} />
          </div>

          <div className="space-y-1.5">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                <SelectItem value="z-api">Z-API</SelectItem>
                <SelectItem value="evolution">Evolution API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "z-api" && (
            <div className="space-y-1.5">
              <Label>Client Token (Z-API)</Label>
              <Input
                value={zapiToken}
                onChange={(e) => setZapiToken(e.target.value)}
                placeholder="Client-Token do Z-API"
              />
            </div>
          )}

          {provider === "evolution" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>URL da Evolution API</Label>
                <Input
                  value={evolutionUrl}
                  onChange={(e) => setEvolutionUrl(e.target.value)}
                  placeholder="https://sua-evolution.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input
                  value={evolutionKey}
                  onChange={(e) => setEvolutionKey(e.target.value)}
                  placeholder="Sua API Key"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome da Instância</Label>
                <Input
                  value={evolutionInstance}
                  onChange={(e) => setEvolutionInstance(e.target.value)}
                  placeholder="minha-instancia"
                />
              </div>
            </div>
          )}

          <Button onClick={() => salvarWppMut.mutate()} disabled={salvarWppMut.isPending}>
            {salvarWppMut.isPending ? "Salvando..." : "Salvar WhatsApp"}
          </Button>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificações Automáticas</CardTitle>
          <CardDescription>Mensagens enviadas automaticamente via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notifBemVindo", label: "Boas-vindas", desc: "Quando um novo tutor se cadastra" },
            { key: "notifAgendamento", label: "Novo agendamento", desc: "Confirmação ao agendar" },
            { key: "notifConfirmacao", label: "Confirmação", desc: "Lembrete de confirmação do tutor" },
            { key: "notifLembrete", label: "Lembrete", desc: "Aviso antes do horário agendado" },
            { key: "notifVacina", label: "Vacina vencendo", desc: "Aviso quando a próxima dose se aproxima" },
            { key: "notifVencimento", label: "Plano vencendo", desc: "Aviso de renovação de plano" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={notifs[key as keyof typeof notifs]}
                onCheckedChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}

          <Button onClick={() => salvarNotifMut.mutate()} disabled={salvarNotifMut.isPending}>
            {salvarNotifMut.isPending ? "Salvando..." : "Salvar Notificações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
