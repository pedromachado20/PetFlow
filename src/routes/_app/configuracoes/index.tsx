import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Wifi } from "lucide-react";
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

const testarConexao = createServerFn({ method: "POST" })
  .validator(z.object({ telefone: z.string().min(10) }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq } = await import("drizzle-orm");
    const { tenants } = await import("~/db/schema");

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant?.whatsappAtivo || tenant.whatsappProvider === "nenhum") {
      throw new Error("WhatsApp não configurado");
    }

    const numero = data.telefone.replace(/\D/g, "");
    const payload = { phone: `55${numero}`, message: "✅ Conexão com PetFlow testada com sucesso!" };

    if (tenant.whatsappProvider === "z-api") {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Client-Token": tenant.zapiClientToken ?? "",
      };
      const url = `${tenant.evolutionApiUrl}/instances/${tenant.evolutionInstance}/token/${tenant.evolutionApiKey}/send-text`;
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Erro Z-API: ${res.status}`);
    } else if (tenant.whatsappProvider === "evolution") {
      const res = await fetch(`${tenant.evolutionApiUrl}/message/sendText/${tenant.evolutionInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": tenant.evolutionApiKey ?? "" },
        body: JSON.stringify({ number: `55${numero}`, text: payload.message }),
      });
      if (!res.ok) throw new Error(`Erro Evolution: ${res.status}`);
    }

    return { ok: true };
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

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schemaDados),
    values: data ? {
      nome: data.nome, email: data.email,
      telefone: data.telefone ?? "", endereco: data.endereco ?? "",
      cidade: data.cidade ?? "", estado: data.estado ?? "", cnpj: data.cnpj ?? "",
    } : undefined,
  });

  const salvarDadosMut = useMutation({
    mutationFn: (v: z.infer<typeof schemaDados>) => salvarDados({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("Dados salvos"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  // WhatsApp state — inicializa quando data carrega
  const [provider, setProvider] = useState("nenhum");
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  const [wppUrl, setWppUrl] = useState("");
  const [wppToken, setWppToken] = useState("");
  const [wppInstance, setWppInstance] = useState("");
  const [wppClientToken, setWppClientToken] = useState("");
  const [telefoneTest, setTelefoneTest] = useState("");

  useEffect(() => {
    if (!data) return;
    setProvider(data.whatsappProvider ?? "nenhum");
    setWhatsappAtivo(data.whatsappAtivo ?? false);
    setWppUrl(data.evolutionApiUrl ?? "");
    setWppToken(data.evolutionApiKey ?? "");
    setWppInstance(data.evolutionInstance ?? "");
    setWppClientToken(data.zapiClientToken ?? "");
  }, [data]);

  const salvarWppMut = useMutation({
    mutationFn: () => salvarWhatsapp({
      data: {
        whatsappAtivo,
        whatsappProvider: provider,
        evolutionApiUrl: wppUrl || undefined,
        evolutionApiKey: wppToken || undefined,
        evolutionInstance: wppInstance || undefined,
        zapiClientToken: wppClientToken || undefined,
      },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("WhatsApp salvo"); },
    onError: () => toast.error("Erro ao salvar WhatsApp"),
  });

  const testarMut = useMutation({
    mutationFn: () => testarConexao({ data: { telefone: telefoneTest } }),
    onSuccess: () => toast.success("Mensagem de teste enviada!"),
    onError: (e: any) => toast.error(e.message ?? "Erro ao testar conexão"),
  });

  // Notificações
  const [notifs, setNotifs] = useState({
    notifAgendamento: false, notifConfirmacao: false, notifLembrete: false,
    notifBemVindo: false, notifVacina: false, notifVencimento: false,
  });

  useEffect(() => {
    if (!data) return;
    setNotifs({
      notifAgendamento: data.notifAgendamento ?? false,
      notifConfirmacao: data.notifConfirmacao ?? false,
      notifLembrete: data.notifLembrete ?? false,
      notifBemVindo: data.notifBemVindo ?? false,
      notifVacina: data.notifVacina ?? false,
      notifVencimento: data.notifVencimento ?? false,
    });
  }, [data]);

  const salvarNotifMut = useMutation({
    mutationFn: () => salvarNotificacoes({ data: notifs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configuracoes"] }); toast.success("Notificações salvas"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-xl space-y-6">

      {/* Dados */}
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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Integração WhatsApp</CardTitle>
            <CardDescription className="mt-1">
              Envie mensagens automáticas para seus clientes via WhatsApp. A integração é opcional — o sistema funciona normalmente sem ela.
            </CardDescription>
          </div>
          {whatsappAtivo && <Badge variant="success">Ativo</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <div>
              <p className="text-sm font-medium">Ativar integração WhatsApp</p>
              <p className="text-xs text-muted-foreground">Quando ativo, mensagens automáticas serão enviadas conforme as notificações configuradas</p>
            </div>
            <Switch checked={whatsappAtivo} onCheckedChange={setWhatsappAtivo} />
          </div>

          <div className="space-y-1.5">
            <Label>Provedor *</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                <SelectItem value="z-api">Z-API</SelectItem>
                <SelectItem value="evolution">Evolution API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "z-api" && (
            <>
              <div className="space-y-1.5">
                <Label>URL da Instância *</Label>
                <Input value={wppUrl} onChange={(e) => setWppUrl(e.target.value)} placeholder="https://api.z-api.io" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Token *</Label>
                  <Input type="password" value={wppToken} onChange={(e) => setWppToken(e.target.value)} placeholder="Token da instância" />
                </div>
                <div className="space-y-1.5">
                  <Label>ID da Instância *</Label>
                  <Input value={wppInstance} onChange={(e) => setWppInstance(e.target.value)} placeholder="ID da instância" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Client Token{" "}
                  <span className="text-muted-foreground font-normal">(Segurança → Security Token no Z-API)</span>
                </Label>
                <Input type="password" value={wppClientToken} onChange={(e) => setWppClientToken(e.target.value)} placeholder="Security Token" />
              </div>
            </>
          )}

          {provider === "evolution" && (
            <>
              <div className="space-y-1.5">
                <Label>URL da API *</Label>
                <Input value={wppUrl} onChange={(e) => setWppUrl(e.target.value)} placeholder="https://sua-evolution.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>API Key *</Label>
                  <Input type="password" value={wppToken} onChange={(e) => setWppToken(e.target.value)} placeholder="API Key" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome da Instância *</Label>
                  <Input value={wppInstance} onChange={(e) => setWppInstance(e.target.value)} placeholder="minha-instancia" />
                </div>
              </div>
            </>
          )}

          {provider !== "nenhum" && (
            <>
              <div className="space-y-1.5">
                <Label>Número para teste (com DDD)</Label>
                <div className="flex gap-2">
                  <Input
                    value={telefoneTest}
                    onChange={(e) => setTelefoneTest(e.target.value)}
                    placeholder="11999999999"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => testarMut.mutate()}
                    disabled={testarMut.isPending || !telefoneTest}
                  >
                    <Wifi className="h-4 w-4" />
                    {testarMut.isPending ? "Testando..." : "Testar Conexão"}
                  </Button>
                </div>
              </div>
            </>
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
            { key: "notifBemVindo",     label: "Boas-vindas",       desc: "Quando um novo tutor se cadastra" },
            { key: "notifAgendamento",  label: "Novo agendamento",  desc: "Confirmação ao agendar" },
            { key: "notifConfirmacao",  label: "Confirmação",       desc: "Lembrete de confirmação do tutor" },
            { key: "notifLembrete",     label: "Lembrete",          desc: "Aviso antes do horário agendado" },
            { key: "notifVacina",       label: "Vacina vencendo",   desc: "Aviso quando a próxima dose se aproxima" },
            { key: "notifVencimento",   label: "Plano vencendo",    desc: "Aviso de renovação de plano" },
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
