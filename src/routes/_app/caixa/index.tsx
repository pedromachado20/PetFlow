import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, Printer, FileText, Plus, Minus, ShoppingCart } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "~/lib/utils";
import { printCupom, printRecibo } from "~/lib/pdf";

/* ── server functions ─────────────────────────────────────────────────── */

const getCaixa = createServerFn({ method: "GET" })
  .validator(z.object({ data: z.string() }))
  .handler(async ({ data: { data } }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { eq, and } = await import("drizzle-orm");
    const { appointments, transacoes, tenants, produtos } = await import("~/db/schema");

    const [appts, pagamentos, tenant, catalogoProdutos] = await Promise.all([
      db.query.appointments.findMany({
        where: and(eq(appointments.tenantId, tenantId), eq(appointments.data, data)),
        with: { tutor: true, pet: true, professional: true, service: true },
        orderBy: (a, { asc }) => [asc(a.tutorId), asc(a.horaInicio)],
      }),
      db.query.transacoes.findMany({
        where: and(eq(transacoes.tenantId, tenantId), eq(transacoes.data, data)),
        columns: { referencia: true, valor: true, categoria: true },
      }),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { nome: true } }),
      db.query.produtos.findMany({
        where: and(eq(produtos.tenantId, tenantId), eq(produtos.ativo, true)),
        orderBy: (p, { asc }) => [asc(p.categoria), asc(p.nome)],
      }),
    ]);

    const map = new Map<string, {
      tutor: NonNullable<(typeof appts)[0]["tutor"]>;
      appointments: typeof appts;
      total: number;
      pago: boolean;
      formaPagamento: string;
      valorPago: number;
    }>();

    for (const a of appts) {
      if (!a.tutor) continue;
      if (!map.has(a.tutorId)) {
        map.set(a.tutorId, { tutor: a.tutor, appointments: [], total: 0, pago: false, formaPagamento: "", valorPago: 0 });
      }
      const g = map.get(a.tutorId)!;
      g.appointments.push(a);
      g.total += parseFloat(a.preco ?? "0");
    }

    for (const pag of pagamentos) {
      if (!pag.referencia?.startsWith("caixa-")) continue;
      const tutorId = pag.referencia.slice(6, -11);
      const g = map.get(tutorId);
      if (g) {
        g.pago = true;
        g.formaPagamento = pag.categoria ?? "";
        g.valorPago = parseFloat(pag.valor ?? "0");
      }
    }

    return { grupos: Array.from(map.values()), nomePetShop: tenant?.nome ?? "Pet Shop", catalogoProdutos };
  });

const registrarPagamento = createServerFn({ method: "POST" })
  .validator(z.object({
    tutorId: z.string(),
    data: z.string(),
    valor: z.coerce.number(),
    desconto: z.coerce.number(),
    formaPagamento: z.string(),
    descricao: z.string(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { transacoes } = await import("~/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const refKey = `caixa-${data.tutorId}-${data.data}`;
    const existing = await db.query.transacoes.findFirst({
      where: and(eq(transacoes.tenantId, tenantId), eq(transacoes.referencia, refKey)),
    });
    if (existing) throw new Error("Pagamento já registrado");

    await db.insert(transacoes).values({
      id: crypto.randomUUID(),
      tenantId,
      tipo: "receita",
      categoria: data.formaPagamento,
      descricao: data.descricao,
      valor: data.valor.toFixed(2),
      status: "pago",
      data: data.data,
      pago: true,
      referencia: refKey,
    });
  });

/* ── types ────────────────────────────────────────────────────────────── */

type Grupo = Awaited<ReturnType<typeof getCaixa>>["grupos"][number];
type ProdutoItem = { produtoId: string; nome: string; preco: number; qty: number };

const formas = [
  { key: "Dinheiro", icon: "💵" },
  { key: "PIX",      icon: "📱" },
  { key: "Débito",   icon: "💳" },
  { key: "Crédito",  icon: "💳" },
];

/* ── route ────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/_app/caixa/")({
  component: CaixaPage,
});

function CaixaPage() {
  const qc = useQueryClient();
  const [dataAtual, setDataAtual] = useState(() => new Date().toISOString().slice(0, 10));
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Grupo | null>(null);
  const [desconto, setDesconto] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [carrinho, setCarrinho] = useState<ProdutoItem[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["caixa", dataAtual],
    queryFn: () => getCaixa({ data: { data: dataAtual } }),
  });

  const pagar = useMutation({
    mutationFn: (vars: { tutorId: string; valor: number; desconto: number }) =>
      registrarPagamento({
        data: {
          tutorId: vars.tutorId,
          data: dataAtual,
          valor: vars.valor,
          desconto: vars.desconto,
          formaPagamento,
          descricao: `Atendimento ${dataAtual} · ${formaPagamento} · ${selecionado?.tutor.nome ?? ""}`,
        },
      }),
    onSuccess: async () => {
      const fresh = await getCaixa({ data: { data: dataAtual } });
      qc.setQueryData(["caixa", dataAtual], fresh);
      const tutorId = selecionado?.tutor.id;
      if (tutorId) {
        const updated = fresh.grupos.find((g) => g.tutor.id === tutorId);
        if (updated) setSelecionado(updated);
      }
      setCarrinho([]);
      toast.success("Pagamento registrado!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar pagamento"),
  });

  function mudarDia(delta: number) {
    const d = new Date(dataAtual + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDataAtual(d.toISOString().slice(0, 10));
    setSelecionado(null);
    setCarrinho([]);
  }

  function selecionarCliente(g: Grupo) {
    setSelecionado(g);
    setDesconto("0");
    setCarrinho([]);
  }

  function adicionarProduto(p: { id: string; nome: string; preco: string }) {
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.produtoId === p.id);
      if (existente) return prev.map((i) => i.produtoId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { produtoId: p.id, nome: p.nome, preco: parseFloat(p.preco), qty: 1 }];
    });
  }

  function removerProduto(produtoId: string) {
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoId);
      if (!existente) return prev;
      if (existente.qty <= 1) return prev.filter((i) => i.produtoId !== produtoId);
      return prev.map((i) => i.produtoId === produtoId ? { ...i, qty: i.qty - 1 } : i);
    });
  }

  const grupos = (data?.grupos ?? []).filter((g) => {
    if (!busca) return true;
    return g.tutor.nome.toLowerCase().includes(busca.toLowerCase()) || g.tutor.telefone?.includes(busca);
  });

  const descontoNum = parseFloat(desconto || "0") || 0;
  const subtotalServicos = selecionado?.appointments.reduce((s, a) => s + parseFloat(a.preco ?? "0"), 0) ?? 0;
  const subtotalProdutos = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
  const subtotal = subtotalServicos + subtotalProdutos;
  const total = Math.max(0, subtotal - descontoNum);

  const nomePetShop = data?.nomePetShop ?? "Pet Shop";
  const catalogo = data?.catalogoProdutos ?? [];

  function handlePrint(tipo: "cupom" | "recibo") {
    if (!selecionado) return;
    const pets = [...new Set(selecionado.appointments.map((a) => a.pet?.nome).filter(Boolean))].join(", ");
    const itensServicos = selecionado.appointments.map((a) => ({
      descricao: a.service?.nome ?? "Serviço",
      profissional: a.professional?.nome ?? "",
      valor: parseFloat(a.preco ?? "0"),
    }));
    const itensProdutos = carrinho.map((i) => ({
      descricao: `${i.nome}${i.qty > 1 ? ` (x${i.qty})` : ""}`,
      profissional: "",
      valor: i.preco * i.qty,
    }));
    const itens = [...itensServicos, ...itensProdutos];
    const opts = {
      nomePetShop,
      tutor: selecionado.tutor.nome,
      pets,
      data: dataAtual,
      itens,
      desconto: descontoNum,
      total: selecionado.pago ? selecionado.valorPago : total,
      formaPagamento: selecionado.pago ? selecionado.formaPagamento : formaPagamento,
    };
    if (tipo === "cupom") printCupom(opts);
    else printRecibo(opts);
  }

  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Painel esquerdo: lista de tutores ────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden bg-card">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mudarDia(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium flex-1 text-center">
              {new Date(dataAtual + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mudarDia(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setDataAtual(new Date().toISOString().slice(0, 10)); setSelecionado(null); setCarrinho([]); }}>
              Hoje
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-2">Carregando...</p>
          ) : !grupos.length ? (
            <p className="text-xs text-muted-foreground p-2 text-center">Sem atendimentos neste dia</p>
          ) : (
            grupos.map((g) => {
              const isActive = selecionado?.tutor.id === g.tutor.id;
              return (
                <button
                  key={g.tutor.id}
                  onClick={() => selecionarCliente(g)}
                  className={`w-full text-left rounded-lg p-3 transition-colors border ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-foreground"
                      : "bg-transparent border-transparent hover:bg-accent/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{g.tutor.nome}</p>
                      <p className="text-xs text-muted-foreground">{g.tutor.telefone ?? ""}</p>
                    </div>
                    {g.pago ? (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0">Pago</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {g.appointments.length} serv.
                      </Badge>
                    )}
                  </div>
                  {!g.pago && <p className="text-xs font-medium text-primary mt-1">{formatCurrency(g.total)}</p>}
                  {g.pago && <p className="text-xs text-success mt-1">{formatCurrency(g.valorPago)}</p>}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
          {grupos.length} cliente{grupos.length !== 1 ? "s" : ""} · {grupos.filter((g) => g.pago).length} pago{grupos.filter((g) => g.pago).length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Painel direito: detalhes + pagamento ─────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selecionado ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">Selecione um cliente para ver os detalhes</p>
          </div>
        ) : (
          <div className="max-w-xl space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selecionado.tutor.nome}</h2>
                <p className="text-sm text-muted-foreground">{selecionado.tutor.telefone}</p>
              </div>
              {selecionado.pago && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                </Badge>
              )}
            </div>

            {/* Serviços realizados */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Serviços Realizados</p>
              <div className="space-y-2">
                {selecionado.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.service?.nome ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.pet?.nome} · {a.professional?.nome} · {a.horaInicio}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={a.status === "concluido" ? "success" : "secondary"} className="text-xs">
                        {a.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm font-medium w-20 text-right">{formatCurrency(a.preco)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos — só mostra se não estiver pago */}
            {!selecionado.pago && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" /> Produtos
                </p>

                {/* Catálogo para selecionar */}
                {catalogo.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {catalogo.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => adicionarProduto(p)}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.nome}</p>
                          <p className="text-xs text-primary font-semibold">{formatCurrency(p.preco)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Carrinho de produtos */}
                {carrinho.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-border p-3">
                    {carrinho.map((item) => (
                      <div key={item.produtoId} className="flex items-center justify-between">
                        <p className="text-sm">{item.nome}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removerProduto(item.produtoId)} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                          <button onClick={() => adicionarProduto({ id: item.produtoId, nome: item.nome, preco: String(item.preco) })} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent">
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.preco * item.qty)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {catalogo.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum produto cadastrado. Cadastre em <strong>Produtos</strong> no menu.</p>
                )}
              </div>
            )}

            {selecionado.pago ? (
              /* ── Estado: já pago ───────────────────────────────────── */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Total pago ({selecionado.formaPagamento})</span>
                  <span className="text-lg font-bold text-success">{formatCurrency(selecionado.valorPago)}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => handlePrint("cupom")}>
                    <Printer className="h-4 w-4" /> Cupom térmico
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handlePrint("recibo")}>
                    <FileText className="h-4 w-4" /> Recibo PDF
                  </Button>
                </div>
                <button onClick={() => setSelecionado(null)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  Próximo cliente →
                </button>
              </div>
            ) : (
              /* ── Estado: aguardando pagamento ──────────────────────── */
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2 text-sm">
                  {subtotalProdutos > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Serviços</span>
                      <span>{formatCurrency(subtotalServicos)}</span>
                    </div>
                  )}
                  {subtotalProdutos > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Produtos</span>
                      <span>{formatCurrency(subtotalProdutos)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Desconto (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      className="w-24 text-right border border-border rounded px-2 py-1 text-sm bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-base font-bold">TOTAL</span>
                  <span className="text-2xl font-black">{formatCurrency(total)}</span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Forma de Pagamento</p>
                  <div className="grid grid-cols-4 gap-2">
                    {formas.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFormaPagamento(f.key)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                          formaPagamento === f.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-xl">{f.icon}</span>
                        <span className="text-xs font-medium">{f.key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-bold"
                  disabled={pagar.isPending}
                  onClick={() => pagar.mutate({ tutorId: selecionado.tutor.id, valor: total, desconto: descontoNum })}
                >
                  {pagar.isPending ? "Registrando..." : `Fechar Caixa — ${formatCurrency(total)}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
