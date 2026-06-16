import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Search, CheckCircle2, Printer, FileText,
  Plus, Minus, ShoppingCart, Zap, X, Check, Trash2, ClipboardList,
} from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
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

const getDadosAvulso = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTenant } = await import("~/server/context");
  const { db } = await import("~/db");
  const { tenantId } = await requireTenant();
  const { eq, and } = await import("drizzle-orm");
  const { tutores, pets, professionals, services } = await import("~/db/schema");

  const [listaTutores, listaProfissionais, listaServicos] = await Promise.all([
    db.query.tutores.findMany({
      where: eq(tutores.tenantId, tenantId),
      with: { pets: { where: eq(pets.ativo, true) } },
      orderBy: (t, { asc }) => [asc(t.nome)],
    }),
    db.query.professionals.findMany({
      where: and(eq(professionals.tenantId, tenantId), eq(professionals.ativo, true)),
      orderBy: (p, { asc }) => [asc(p.nome)],
    }),
    db.query.services.findMany({
      where: and(eq(services.tenantId, tenantId), eq(services.ativo, true)),
      orderBy: (s, { asc }) => [asc(s.nome)],
    }),
  ]);

  return { tutores: listaTutores, profissionais: listaProfissionais, servicos: listaServicos };
});

const registrarAtendimentoAvulso = createServerFn({ method: "POST" })
  .validator(z.object({
    // cliente existente ou novo
    tutorId: z.string().optional(),
    novoNomeTutor: z.string().optional(),
    nomePet: z.string().optional(),
    petId: z.string().optional(),
    profissionalId: z.string().optional(),
    // serviços do catálogo
    servicos: z.array(z.object({ serviceId: z.string(), nome: z.string(), preco: z.string() })),
    // itens extras (procedimentos livres)
    itensExtras: z.array(z.object({ descricao: z.string(), valor: z.string() })),
    // produtos
    produtos: z.array(z.object({ produtoId: z.string(), nome: z.string(), preco: z.number(), qty: z.number() })),
    // laudo para prontuário
    laudo: z.string().optional(),
    // pagamento
    desconto: z.number(),
    formaPagamento: z.string(),
    data: z.string(),
    total: z.number(),
    tutorNome: z.string(),
  }))
  .handler(async ({ data }) => {
    const { requireTenant } = await import("~/server/context");
    const { db } = await import("~/db");
    const { tenantId } = await requireTenant();
    const { appointments, transacoes, tutores, pets, prontuarios } = await import("~/db/schema");

    const horaAtual = new Date().toTimeString().slice(0, 5);
    let finalTutorId = data.tutorId;
    let finalPetId = data.petId;

    // Criar tutor novo se necessário
    if (!finalTutorId && data.novoNomeTutor?.trim()) {
      const newId = crypto.randomUUID();
      await db.insert(tutores).values({ id: newId, tenantId, nome: data.novoNomeTutor.trim() });
      finalTutorId = newId;
    }

    // Criar pet novo se necessário
    if (finalTutorId && !finalPetId && data.nomePet?.trim()) {
      const newId = crypto.randomUUID();
      await db.insert(pets).values({
        id: newId, tenantId, tutorId: finalTutorId, nome: data.nomePet.trim(),
      });
      finalPetId = newId;
    }

    // Criar appointments (gera histórico do pet)
    if (finalTutorId && finalPetId && data.profissionalId && data.servicos.length > 0) {
      await Promise.all(
        data.servicos.map((s) =>
          db.insert(appointments).values({
            id: crypto.randomUUID(),
            tenantId,
            tutorId: finalTutorId!,
            petId: finalPetId!,
            professionalId: data.profissionalId!,
            serviceId: s.serviceId,
            data: data.data,
            horaInicio: horaAtual,
            horaFim: horaAtual,
            preco: s.preco,
            status: "concluido",
          })
        )
      );
    }

    // Salvar laudo no prontuário do pet
    if (finalPetId && data.laudo?.trim()) {
      const textoLaudo = [
        data.laudo.trim(),
        data.itensExtras.filter((i) => i.descricao).map((i) => `• ${i.descricao}`).join("\n"),
      ].filter(Boolean).join("\n\n");

      await db.insert(prontuarios).values({
        id: crypto.randomUUID(),
        tenantId,
        petId: finalPetId,
        profissionalId: data.profissionalId ?? null,
        dataConsulta: data.data,
        observacoes: textoLaudo,
      });
    }

    // Montar descrição da transação
    const partes = [
      `Atendimento avulso · ${data.tutorNome}`,
      [...data.servicos.map((s) => s.nome), ...data.itensExtras.filter((i) => i.descricao).map((i) => i.descricao)].join(", "),
      data.produtos.map((p) => `${p.nome}${p.qty > 1 ? ` x${p.qty}` : ""}`).join(", "),
    ].filter(Boolean);

    await db.insert(transacoes).values({
      id: crypto.randomUUID(),
      tenantId,
      tipo: "receita",
      categoria: data.formaPagamento,
      descricao: partes.join(" | "),
      valor: data.total.toFixed(2),
      status: "pago",
      data: data.data,
      pago: true,
      referencia: `avulso-${crypto.randomUUID()}`,
    });
  });

/* ── types ────────────────────────────────────────────────────────────── */

type Grupo = Awaited<ReturnType<typeof getCaixa>>["grupos"][number];
type ProdutoItem = { produtoId: string; nome: string; preco: number; qty: number };
type DadosAvulso = Awaited<ReturnType<typeof getDadosAvulso>>;
type ServicoSelecionado = { serviceId: string; nome: string; preco: string };
type ItemExtra = { id: string; descricao: string; valor: string };

const formas = [
  { key: "Dinheiro", icon: "💵" },
  { key: "PIX",      icon: "📱" },
  { key: "Débito",   icon: "💳" },
  { key: "Crédito",  icon: "💳" },
];

/* ── Atendimento Avulso Dialog ────────────────────────────────────────── */

function AtendimentoAvulsoDialog({
  open, onClose, dados, catalogoProdutos, nomePetShop, dataAtual, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  dados: DadosAvulso | undefined;
  catalogoProdutos: Awaited<ReturnType<typeof getCaixa>>["catalogoProdutos"];
  nomePetShop: string;
  dataAtual: string;
  onSuccess: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [semCadastro, setSemCadastro] = useState(false);
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [nomePetNovo, setNomePetNovo] = useState("");
  const [tutorSel, setTutorSel] = useState<DadosAvulso["tutores"][0] | null>(null);
  const [petSel, setPetSel] = useState("");
  const [profSel, setProfSel] = useState("");
  const [servicosSel, setServicosSel] = useState<ServicoSelecionado[]>([]);
  const [itensExtras, setItensExtras] = useState<ItemExtra[]>([]);
  const [carrinho, setCarrinho] = useState<ProdutoItem[]>([]);
  const [laudo, setLaudo] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [formaPag, setFormaPag] = useState("Dinheiro");

  function resetar() {
    setBusca(""); setSemCadastro(false); setNomeAvulso(""); setNomePetNovo("");
    setTutorSel(null); setPetSel(""); setProfSel("");
    setServicosSel([]); setItensExtras([]); setCarrinho([]);
    setLaudo(""); setDesconto("0"); setFormaPag("Dinheiro");
  }

  function fechar() { resetar(); onClose(); }

  function toggleServico(s: DadosAvulso["servicos"][0]) {
    setServicosSel((prev) => {
      const existe = prev.find((x) => x.serviceId === s.id);
      if (existe) return prev.filter((x) => x.serviceId !== s.id);
      return [...prev, { serviceId: s.id, nome: s.nome, preco: s.preco ?? "0" }];
    });
  }

  function addItemExtra() {
    setItensExtras((prev) => [...prev, { id: crypto.randomUUID(), descricao: "", valor: "" }]);
  }
  function updateItemExtra(id: string, field: "descricao" | "valor", value: string) {
    setItensExtras((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function removeItemExtra(id: string) {
    setItensExtras((prev) => prev.filter((i) => i.id !== id));
  }

  function adicionarProduto(p: { id: string; nome: string; preco: string }) {
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.produtoId === p.id);
      if (ex) return prev.map((i) => i.produtoId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { produtoId: p.id, nome: p.nome, preco: parseFloat(p.preco), qty: 1 }];
    });
  }
  function removerProduto(produtoId: string) {
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.produtoId === produtoId);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter((i) => i.produtoId !== produtoId);
      return prev.map((i) => i.produtoId === produtoId ? { ...i, qty: i.qty - 1 } : i);
    });
  }

  const tutoresFiltrados = (dados?.tutores ?? []).filter((t) =>
    busca.length >= 2 && t.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const extrasValidos = itensExtras.filter((i) => i.descricao.trim() && parseFloat(i.valor) > 0);
  const descontoNum = parseFloat(desconto || "0") || 0;
  const subServicos = servicosSel.reduce((s, i) => s + parseFloat(i.preco), 0);
  const subExtras = extrasValidos.reduce((s, i) => s + parseFloat(i.valor), 0);
  const subProdutos = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
  const total = Math.max(0, subServicos + subExtras + subProdutos - descontoNum);

  const tutorNome = semCadastro
    ? (nomeAvulso.trim() || "Cliente sem cadastro")
    : (tutorSel?.nome ?? "");

  // tem pet vinculado (existente ou novo)
  const temPet = (tutorSel && petSel) || (semCadastro && nomeAvulso.trim() && nomePetNovo.trim());

  const podeSalvar =
    (semCadastro || tutorSel) &&
    (servicosSel.length > 0 || extrasValidos.length > 0 || carrinho.length > 0);

  const profNome = dados?.profissionais.find((p) => p.id === profSel)?.nome ?? "";
  const petNomeDisplay = tutorSel
    ? tutorSel.pets.find((p) => p.id === petSel)?.nome ?? ""
    : nomePetNovo;

  const registrar = useMutation({
    mutationFn: () =>
      registrarAtendimentoAvulso({
        data: {
          tutorId: tutorSel?.id,
          novoNomeTutor: semCadastro ? nomeAvulso.trim() : undefined,
          nomePet: semCadastro ? nomePetNovo.trim() : undefined,
          petId: tutorSel ? petSel : undefined,
          profissionalId: profSel || undefined,
          servicos: servicosSel,
          itensExtras: extrasValidos,
          produtos: carrinho,
          laudo: laudo.trim() || undefined,
          desconto: descontoNum,
          formaPagamento: formaPag,
          data: dataAtual,
          total,
          tutorNome,
        },
      }),
    onSuccess: () => {
      const itensServicosImp = [
        ...servicosSel.map((s) => ({ descricao: s.nome, profissional: profNome, valor: parseFloat(s.preco) })),
        ...extrasValidos.map((i) => ({ descricao: i.descricao, profissional: profNome, valor: parseFloat(i.valor) })),
      ];
      const itensProdutosImp = carrinho.map((i) => ({
        descricao: `${i.nome}${i.qty > 1 ? ` (x${i.qty})` : ""}`,
        valor: i.preco * i.qty,
      }));
      printCupom({
        nomePetShop,
        tutor: tutorNome,
        pets: petNomeDisplay,
        data: dataAtual,
        itensServicos: itensServicosImp,
        itensProdutos: itensProdutosImp,
        desconto: descontoNum,
        total,
        formaPagamento: formaPag,
      });
      toast.success("Atendimento registrado!");
      fechar();
      onSuccess();
    },
    onError: () => toast.error("Erro ao registrar atendimento"),
  });

  const petDoTutor = tutorSel?.pets ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Atendimento Avulso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">

          {/* ── Cliente ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cliente</Label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={semCadastro}
                onChange={(e) => { setSemCadastro(e.target.checked); setTutorSel(null); setBusca(""); setNomePetNovo(""); }} />
              Cliente sem cadastro
            </label>

            {semCadastro ? (
              <div className="space-y-2">
                <Input placeholder="Nome do tutor (opcional)" value={nomeAvulso} onChange={(e) => setNomeAvulso(e.target.value)} />
                {nomeAvulso.trim() && (
                  <Input placeholder="Nome do pet" value={nomePetNovo} onChange={(e) => setNomePetNovo(e.target.value)} />
                )}
                {nomeAvulso.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {nomePetNovo.trim()
                      ? "✓ Tutor e pet serão cadastrados automaticamente ao confirmar."
                      : "Informe o nome do pet para cadastrá-lo."}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar tutor pelo nome..."
                    value={busca} onChange={(e) => { setBusca(e.target.value); setTutorSel(null); setPetSel(""); }} />
                </div>
                {tutorSel && (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-3 py-2">
                    <span className="text-sm font-medium text-primary">{tutorSel.nome}</span>
                    <button onClick={() => { setTutorSel(null); setBusca(""); setPetSel(""); }}>
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}
                {!tutorSel && tutoresFiltrados.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-36 overflow-y-auto">
                    {tutoresFiltrados.map((t) => (
                      <button key={t.id} onClick={() => { setTutorSel(t); setBusca(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center justify-between">
                        <span>{t.nome}</span>
                        <span className="text-xs text-muted-foreground">{t.pets.length} pet(s)</span>
                      </button>
                    ))}
                  </div>
                )}
                {busca.length >= 2 && tutoresFiltrados.length === 0 && !tutorSel && (
                  <p className="text-xs text-muted-foreground px-1">Nenhum tutor encontrado.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Pet (tutor cadastrado) ───────────────────────────────── */}
          {tutorSel && petDoTutor.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pet</Label>
              <div className="flex flex-wrap gap-2">
                {petDoTutor.map((p) => (
                  <button key={p.id} onClick={() => setPetSel(petSel === p.id ? "" : p.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${petSel === p.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {petSel === p.id && <Check className="h-3 w-3" />}
                    {p.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Profissional (quando há pet vinculado) ──────────────── */}
          {temPet && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Profissional <span className="text-muted-foreground normal-case font-normal">(para histórico do pet)</span>
              </Label>
              <Select value={profSel} onValueChange={setProfSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                <SelectContent>
                  {(dados?.profissionais ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Serviços do catálogo ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Serviços do Catálogo</Label>
            {(dados?.servicos ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(dados?.servicos ?? []).map((s) => {
                  const sel = servicosSel.some((x) => x.serviceId === s.id);
                  return (
                    <button key={s.id} onClick={() => toggleServico(s)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${sel ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{s.nome}</p>
                        <p className="text-xs font-semibold">{formatCurrency(s.preco)}</p>
                      </div>
                      {sel ? <Check className="h-4 w-4 shrink-0 ml-1" /> : <Plus className="h-4 w-4 shrink-0 ml-1 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Itens extras / Procedimentos livres ─────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Procedimentos / Itens Extras
              </Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItemExtra}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {itensExtras.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Use para cirurgias, procedimentos ou serviços que não estão no catálogo.
              </p>
            ) : (
              <div className="space-y-2">
                {itensExtras.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <Input
                      className="flex-1 h-8 text-xs"
                      placeholder="Descrição do procedimento"
                      value={item.descricao}
                      onChange={(e) => updateItemExtra(item.id, "descricao", e.target.value)}
                    />
                    <Input
                      className="w-28 h-8 text-xs text-right"
                      placeholder="R$ 0,00"
                      value={item.valor}
                      onChange={(e) => updateItemExtra(item.id, "valor", e.target.value)}
                    />
                    <button onClick={() => removeItemExtra(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Produtos ────────────────────────────────────────────── */}
          {catalogoProdutos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" /> Produtos
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {catalogoProdutos.map((p) => (
                  <button key={p.id} onClick={() => adicionarProduto(p)}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-primary font-semibold">{formatCurrency(p.preco)}</p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </button>
                ))}
              </div>
              {carrinho.length > 0 && (
                <div className="space-y-1 rounded-lg border border-border p-3 mt-1">
                  {carrinho.map((item) => (
                    <div key={item.produtoId} className="flex items-center justify-between">
                      <p className="text-sm">{item.nome}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removerProduto(item.produtoId)} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent"><Minus className="h-3 w-3" /></button>
                        <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                        <button onClick={() => adicionarProduto({ id: item.produtoId, nome: item.nome, preco: String(item.preco) })} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent"><Plus className="h-3 w-3" /></button>
                        <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.preco * item.qty)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Laudo / Observações ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5" /> Laudo / Observações
              {temPet && <span className="font-normal normal-case text-primary">(salvo no prontuário do pet)</span>}
            </Label>
            <textarea
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              placeholder={temPet
                ? "Ex: Pet apresentou hérnia abdominal. Intervenção cirúrgica realizada com sucesso. Retorno em 10 dias."
                : "Descreva o que foi realizado no atendimento..."}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
            />
          </div>

          {/* ── Pagamento ───────────────────────────────────────────── */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pagamento</Label>

            <div className="space-y-1.5 text-sm">
              {subServicos > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Serviços</span><span>{formatCurrency(subServicos)}</span></div>}
              {subExtras > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Procedimentos extras</span><span>{formatCurrency(subExtras)}</span></div>}
              {subProdutos > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Produtos</span><span>{formatCurrency(subProdutos)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subServicos + subExtras + subProdutos)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Desconto (R$)</span>
                <input type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)}
                  className="w-24 text-right border border-border rounded px-2 py-1 text-sm bg-background" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-bold">TOTAL</span>
              <span className="text-2xl font-black">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {formas.map((f) => (
                <button key={f.key} onClick={() => setFormaPag(f.key)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-colors ${formaPag === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-xs font-medium">{f.key}</span>
                </button>
              ))}
            </div>

            <Button className="w-full h-11 font-bold" disabled={!podeSalvar || registrar.isPending} onClick={() => registrar.mutate()}>
              {registrar.isPending ? "Registrando..." : `Registrar Atendimento — ${formatCurrency(total)}`}
            </Button>

            {!podeSalvar && (
              <p className="text-xs text-muted-foreground text-center">
                {!tutorSel && !semCadastro
                  ? "Selecione um cliente ou marque 'sem cadastro'"
                  : "Selecione ao menos um serviço, procedimento ou produto"}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [avulsoOpen, setAvulsoOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["caixa", dataAtual],
    queryFn: () => getCaixa({ data: { data: dataAtual } }),
  });

  const { data: dadosAvulso } = useQuery({
    queryKey: ["dadosAvulso"],
    queryFn: () => getDadosAvulso(),
    enabled: avulsoOpen,
    staleTime: 60_000,
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
      valor: i.preco * i.qty,
    }));
    const opts = {
      nomePetShop,
      tutor: selecionado.tutor.nome,
      pets,
      data: dataAtual,
      itensServicos,
      itensProdutos,
      desconto: descontoNum,
      total: selecionado.pago ? selecionado.valorPago : total,
      formaPagamento: selecionado.pago ? selecionado.formaPagamento : formaPagamento,
    };
    if (tipo === "cupom") printCupom(opts);
    else printRecibo(opts);
  }

  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Painel esquerdo ─────────────────────────────────────────── */}
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
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
              onClick={() => { setDataAtual(new Date().toISOString().slice(0, 10)); setSelecionado(null); setCarrinho([]); }}>
              Hoje
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Button size="sm" className="w-full h-8 gap-1.5 text-xs" variant="outline" onClick={() => setAvulsoOpen(true)}>
            <Zap className="h-3.5 w-3.5 text-primary" /> Atendimento Avulso
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-2">Carregando...</p>
          ) : !grupos.length ? (
            <p className="text-xs text-muted-foreground p-2 text-center">Sem atendimentos agendados neste dia</p>
          ) : (
            grupos.map((g) => {
              const isActive = selecionado?.tutor.id === g.tutor.id;
              return (
                <button key={g.tutor.id} onClick={() => selecionarCliente(g)}
                  className={`w-full text-left rounded-lg p-3 transition-colors border ${isActive ? "bg-primary/10 border-primary/40 text-foreground" : "bg-transparent border-transparent hover:bg-accent/50 hover:border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{g.tutor.nome}</p>
                      <p className="text-xs text-muted-foreground">{g.tutor.telefone ?? ""}</p>
                    </div>
                    {g.pago
                      ? <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0">Pago</Badge>
                      : <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{g.appointments.length} serv.</Badge>}
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

      {/* ── Painel direito ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selecionado ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">Selecione um cliente agendado ou use <strong>Atendimento Avulso</strong></p>
          </div>
        ) : (
          <div className="max-w-xl space-y-6">
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Serviços Realizados</p>
              <div className="space-y-2">
                {selecionado.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.service?.nome ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{a.pet?.nome} · {a.professional?.nome} · {a.horaInicio}</p>
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

            {!selecionado.pago && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" /> Produtos
                </p>
                {catalogo.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {catalogo.map((p) => (
                      <button key={p.id} onClick={() => adicionarProduto(p)}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.nome}</p>
                          <p className="text-xs text-primary font-semibold">{formatCurrency(p.preco)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
                {carrinho.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-border p-3">
                    {carrinho.map((item) => (
                      <div key={item.produtoId} className="flex items-center justify-between">
                        <p className="text-sm">{item.nome}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removerProduto(item.produtoId)} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                          <button onClick={() => adicionarProduto({ id: item.produtoId, nome: item.nome, preco: String(item.preco) })} className="h-6 w-6 flex items-center justify-center rounded border border-border hover:bg-accent"><Plus className="h-3 w-3" /></button>
                          <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.preco * item.qty)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selecionado.pago ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Total pago ({selecionado.formaPagamento})</span>
                  <span className="text-lg font-bold text-success">{formatCurrency(selecionado.valorPago)}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => handlePrint("cupom")}><Printer className="h-4 w-4" /> Cupom térmico</Button>
                  <Button variant="outline" className="flex-1" onClick={() => handlePrint("recibo")}><FileText className="h-4 w-4" /> Recibo PDF</Button>
                </div>
                <button onClick={() => { setSelecionado(null); setCarrinho([]); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  Próximo cliente →
                </button>
              </div>
            ) : (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2 text-sm">
                  {subtotalProdutos > 0 && <>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Serviços</span><span>{formatCurrency(subtotalServicos)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Produtos</span><span>{formatCurrency(subtotalProdutos)}</span></div>
                  </>}
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Desconto (R$)</span>
                    <input type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)}
                      className="w-24 text-right border border-border rounded px-2 py-1 text-sm bg-background" />
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
                      <button key={f.key} onClick={() => setFormaPagamento(f.key)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${formaPagamento === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        <span className="text-xl">{f.icon}</span>
                        <span className="text-xs font-medium">{f.key}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-12 text-base font-bold" disabled={pagar.isPending}
                  onClick={() => pagar.mutate({ tutorId: selecionado.tutor.id, valor: total, desconto: descontoNum })}>
                  {pagar.isPending ? "Registrando..." : `Fechar Caixa — ${formatCurrency(total)}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AtendimentoAvulsoDialog
        open={avulsoOpen}
        onClose={() => setAvulsoOpen(false)}
        dados={dadosAvulso}
        catalogoProdutos={catalogo}
        nomePetShop={nomePetShop}
        dataAtual={dataAtual}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["caixa", dataAtual] })}
      />
    </div>
  );
}
