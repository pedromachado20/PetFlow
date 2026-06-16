import { formatCurrency } from "./utils";

function openPrint(html: string) {
  const win = window.open("", "_blank");
  if (!win) { alert("Pop-up bloqueado. Permita pop-ups para imprimir."); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 20px; }
  h1 { font-size: 17px; margin: 0 0 3px; }
  .sub { font-size: 10px; color: #777; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f4f4f4; text-align: left; padding: 7px 8px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  @media print { body { padding: 12px; } }
`;

export function printFinanceiro(opts: {
  nomeMes: string;
  tipo: "receita" | "despesa" | "ambos";
  receitas: { data: string; categoria: string; descricao: string; valor: string }[];
  despesas: { data: string; categoria: string; descricao: string; valor: string }[];
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}) {
  const fmt = (v: number | string) =>
    parseFloat(String(v)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtData = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

  const rowsReceitas = opts.receitas
    .map((r) => `<tr>
      <td>${fmtData(r.data)}</td>
      <td>${r.categoria}</td>
      <td>${r.descricao}</td>
      <td class="val green">+ ${fmt(r.valor)}</td>
    </tr>`)
    .join("");

  const rowsDespesas = opts.despesas
    .map((r) => `<tr>
      <td>${fmtData(r.data)}</td>
      <td>${r.categoria}</td>
      <td>${r.descricao}</td>
      <td class="val red">- ${fmt(r.valor)}</td>
    </tr>`)
    .join("");

  const secaoReceitas = `
    <div class="section-header green-bg">
      <span>RECEITAS</span>
      <span>${fmt(opts.totalReceitas)}</span>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${rowsReceitas || "<tr><td colspan='4' style='color:#999;text-align:center;padding:12px'>Nenhuma receita no período</td></tr>"}
        <tr class="subtotal-row green-row">
          <td colspan="3"><strong>Total Receitas</strong></td>
          <td class="val green"><strong>${fmt(opts.totalReceitas)}</strong></td>
        </tr>
      </tbody>
    </table>`;

  const divisor = `<div class="divisor"></div>`;

  const secaoDespesas = `
    <div class="section-header red-bg">
      <span>DESPESAS</span>
      <span>${fmt(opts.totalDespesas)}</span>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${rowsDespesas || "<tr><td colspan='4' style='color:#999;text-align:center;padding:12px'>Nenhuma despesa no período</td></tr>"}
        <tr class="subtotal-row red-row">
          <td colspan="3"><strong>Total Despesas</strong></td>
          <td class="val red"><strong>${fmt(opts.totalDespesas)}</strong></td>
        </tr>
      </tbody>
    </table>`;

  const resumoFinal = opts.tipo === "ambos" ? `
    <div class="resumo-final">
      <div class="resumo-linha"><span>Total Receitas</span><span class="green">${fmt(opts.totalReceitas)}</span></div>
      <div class="resumo-linha"><span>Total Despesas</span><span class="red">- ${fmt(opts.totalDespesas)}</span></div>
      <div class="resumo-linha saldo-linha">
        <span>SALDO DO MÊS</span>
        <span class="${opts.saldo >= 0 ? "green" : "red"}">${fmt(opts.saldo)}</span>
      </div>
    </div>` : "";

  const titulo = opts.tipo === "receita"
    ? `Receitas — ${opts.nomeMes}`
    : opts.tipo === "despesa"
    ? `Despesas — ${opts.nomeMes}`
    : `Financeiro Completo — ${opts.nomeMes}`;

  const corpo = opts.tipo === "receita"
    ? secaoReceitas
    : opts.tipo === "despesa"
    ? secaoDespesas
    : secaoReceitas + divisor + secaoDespesas;

  openPrint(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 28px 36px; }
  .cabecalho { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #111; }
  .cabecalho h1 { font-size: 20px; }
  .cabecalho p { font-size: 10px; color: #777; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #f4f4f4; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 2px solid #ddd; }
  th:last-child { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .val { text-align: right; white-space: nowrap; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .section-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px 6px 0 0; font-weight: bold; font-size: 13px; margin-top: 8px; }
  .green-bg { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; border-bottom: none; }
  .red-bg { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-bottom: none; }
  .subtotal-row td { background: #fafafa; padding-top: 8px; padding-bottom: 8px; }
  .green-row td { border-top: 1px solid #bbf7d0; }
  .red-row td { border-top: 1px solid #fecaca; }
  .divisor { margin: 28px 0; border: none; border-top: 2px dashed #d1d5db; position: relative; }
  .divisor::after { content: ""; display: block; }
  .resumo-final { margin-top: 28px; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .resumo-linha { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .resumo-linha:last-child { border-bottom: none; }
  .saldo-linha { background: #f8fafc; font-weight: bold; font-size: 15px; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<div class="cabecalho">
  <div>
    <h1>${titulo}</h1>
    <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</div>
${corpo}
${resumoFinal}
</body></html>`);
}

export function printTable(title: string, headers: string[], rows: (string | number)[][], info = "") {
  const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "-"}</td>`).join("")}</tr>`).join("");
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>${BASE_CSS}</style></head><body>
    <h1>${title}</h1>
    <p class="sub">${info ? info + " · " : ""}Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body></html>`);
}

export function printRecibo(opts: {
  nomePetShop: string;
  tutor: string;
  pets: string;
  data: string;
  itensServicos: { descricao: string; profissional: string; valor: number }[];
  itensProdutos: { descricao: string; valor: number }[];
  desconto: number;
  total: number;
  formaPagamento: string;
}) {
  const subServicos = opts.itensServicos.reduce((s, i) => s + i.valor, 0);
  const subProdutos = opts.itensProdutos.reduce((s, i) => s + i.valor, 0);
  const subtotal = subServicos + subProdutos;

  const rowsServicos = opts.itensServicos
    .map((i) => `<tr><td>${i.descricao}</td><td>${i.profissional}</td><td style="text-align:right">${formatCurrency(i.valor)}</td></tr>`)
    .join("");

  const rowsProdutos = opts.itensProdutos.length > 0
    ? `
      <tr><td colspan="3" style="padding-top:14px;padding-bottom:4px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #ddd">Produtos</td></tr>
      ${opts.itensProdutos.map((i) => `<tr><td colspan="2">${i.descricao}</td><td style="text-align:right">${formatCurrency(i.valor)}</td></tr>`).join("")}
    `
    : "";

  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo</title>
    <style>
      ${BASE_CSS}
      .header { display:flex; justify-content:space-between; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #111; }
      .footer { margin-top:48px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; text-align:center; }
      .total-line td { font-weight:bold; font-size:13px; }
      .section-label td { font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:.5px; color:#555; padding-bottom:4px; border-bottom:2px solid #ddd; }
    </style></head><body>
    <div class="header">
      <div><h1>${opts.nomePetShop}</h1><p class="sub">Recibo de Pagamento</p></div>
      <p class="sub" style="text-align:right">Data: ${new Date(opts.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
    </div>
    <p><strong>Tutor:</strong> ${opts.tutor} &nbsp;·&nbsp; <strong>Pet(s):</strong> ${opts.pets}</p>
    <table style="margin-top:12px">
      <thead><tr><th>Serviços</th><th>Profissional</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${rowsServicos}
        ${rowsProdutos}
        <tr style="background:#f9f9f9">
          <td colspan="2"><strong>Subtotal</strong></td>
          <td style="text-align:right"><strong>${formatCurrency(subtotal)}</strong></td>
        </tr>
        ${opts.desconto > 0 ? `<tr><td colspan="2">Desconto</td><td style="text-align:right">- ${formatCurrency(opts.desconto)}</td></tr>` : ""}
        <tr class="total-line"><td colspan="2">TOTAL</td><td style="text-align:right">${formatCurrency(opts.total)}</td></tr>
        <tr><td colspan="2">Forma de pagamento</td><td style="text-align:right">${opts.formaPagamento}</td></tr>
      </tbody>
    </table>
    <div class="footer">Obrigado pela preferência!</div>
  </body></html>`);
}

export function printCupom(opts: {
  nomePetShop: string;
  tutor: string;
  pets: string;
  data: string;
  itensServicos: { descricao: string; valor: number }[];
  itensProdutos: { descricao: string; valor: number }[];
  desconto: number;
  total: number;
  formaPagamento: string;
}) {
  const subServicos = opts.itensServicos.reduce((s, i) => s + i.valor, 0);
  const subProdutos = opts.itensProdutos.reduce((s, i) => s + i.valor, 0);
  const subtotal = subServicos + subProdutos;

  const linhasServicos = opts.itensServicos
    .map((i) => `<div class="row"><span>${i.descricao}</span><span>${formatCurrency(i.valor)}</span></div>`)
    .join("");

  const linhasProdutos = opts.itensProdutos.length > 0
    ? `
      <div class="line"></div>
      <div class="section-label">PRODUTOS</div>
      ${opts.itensProdutos.map((i) => `<div class="row"><span>${i.descricao}</span><span>${formatCurrency(i.valor)}</span></div>`).join("")}
    `
    : "";

  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title>
    <style>
      body { font-family: monospace; font-size:11px; width:300px; margin:0 auto; padding:10px; }
      .c { text-align:center; } .bold { font-weight:bold; }
      .line { border-top:1px dashed #aaa; margin:6px 0; }
      .row { display:flex; justify-content:space-between; margin:2px 0; }
      .section-label { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:.5px; color:#555; margin:4px 0 2px; }
      @media print { body { width:72mm; } }
    </style></head><body>
    <div class="c bold" style="font-size:13px">${opts.nomePetShop}</div>
    <div class="c" style="font-size:9px;color:#555">${new Date(opts.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
    <div class="line"></div>
    <div><strong>Tutor:</strong> ${opts.tutor}</div>
    <div><strong>Pet(s):</strong> ${opts.pets}</div>
    <div class="line"></div>
    <div class="section-label">SERVIÇOS</div>
    ${linhasServicos}
    ${linhasProdutos}
    <div class="line"></div>
    ${subProdutos > 0 ? `<div class="row"><span>Subtotal serviços</span><span>${formatCurrency(subServicos)}</span></div>` : ""}
    ${subProdutos > 0 ? `<div class="row"><span>Subtotal produtos</span><span>${formatCurrency(subProdutos)}</span></div>` : ""}
    ${subProdutos > 0 ? `<div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>` : `<div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>`}
    ${opts.desconto > 0 ? `<div class="row"><span>Desconto</span><span>- ${formatCurrency(opts.desconto)}</span></div>` : ""}
    <div class="row bold"><span>TOTAL</span><span>${formatCurrency(opts.total)}</span></div>
    <div class="row" style="font-size:10px;color:#555"><span>${opts.formaPagamento}</span></div>
    <div class="line"></div>
    <div class="c" style="font-size:9px">Obrigado pela preferência!</div>
  </body></html>`);
}
