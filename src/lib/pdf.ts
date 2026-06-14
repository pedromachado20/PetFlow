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
  itens: { descricao: string; profissional: string; valor: number }[];
  desconto: number;
  total: number;
  formaPagamento: string;
}) {
  const sub = opts.itens.reduce((s, i) => s + i.valor, 0);
  const rows = opts.itens
    .map((i) => `<tr><td>${i.descricao}</td><td>${i.profissional}</td><td style="text-align:right">${formatCurrency(i.valor)}</td></tr>`)
    .join("");
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo</title>
    <style>
      ${BASE_CSS}
      .header { display:flex; justify-content:space-between; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #111; }
      .footer { margin-top:48px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; text-align:center; }
      .total-line td { font-weight:bold; font-size:13px; }
    </style></head><body>
    <div class="header">
      <div><h1>${opts.nomePetShop}</h1><p class="sub">Recibo de Pagamento</p></div>
      <p class="sub" style="text-align:right">Data: ${new Date(opts.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
    </div>
    <p><strong>Tutor:</strong> ${opts.tutor} &nbsp;·&nbsp; <strong>Pet(s):</strong> ${opts.pets}</p>
    <table style="margin-top:12px">
      <thead><tr><th>Serviço</th><th>Profissional</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${rows}
        <tr style="background:#f9f9f9"><td colspan="2"><strong>Subtotal</strong></td><td style="text-align:right"><strong>${formatCurrency(sub)}</strong></td></tr>
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
  itens: { descricao: string; valor: number }[];
  desconto: number;
  total: number;
  formaPagamento: string;
}) {
  const sub = opts.itens.reduce((s, i) => s + i.valor, 0);
  const linhas = opts.itens
    .map((i) => `<div class="row"><span>${i.descricao}</span><span>${formatCurrency(i.valor)}</span></div>`)
    .join("");
  openPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title>
    <style>
      body { font-family: monospace; font-size:11px; width:300px; margin:0 auto; padding:10px; }
      .c { text-align:center; } .bold { font-weight:bold; }
      .line { border-top:1px dashed #aaa; margin:6px 0; }
      .row { display:flex; justify-content:space-between; margin:2px 0; }
      @media print { body { width:72mm; } }
    </style></head><body>
    <div class="c bold" style="font-size:13px">${opts.nomePetShop}</div>
    <div class="c" style="font-size:9px;color:#555">${new Date(opts.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
    <div class="line"></div>
    <div><strong>Tutor:</strong> ${opts.tutor}</div>
    <div><strong>Pet(s):</strong> ${opts.pets}</div>
    <div class="line"></div>
    ${linhas}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${formatCurrency(sub)}</span></div>
    ${opts.desconto > 0 ? `<div class="row"><span>Desconto</span><span>- ${formatCurrency(opts.desconto)}</span></div>` : ""}
    <div class="row bold"><span>TOTAL</span><span>${formatCurrency(opts.total)}</span></div>
    <div class="row" style="font-size:10px;color:#555"><span>${opts.formaPagamento}</span></div>
    <div class="line"></div>
    <div class="c" style="font-size:9px">Obrigado pela preferência!</div>
  </body></html>`);
}
