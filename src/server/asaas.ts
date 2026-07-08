const BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

function headers() {
  return {
    "Content-Type": "application/json",
    access_token: process.env.ASAAS_API_KEY || "",
  };
}

async function asaasFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers: { ...headers(), ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.errors?.[0]?.description || `Erro Asaas ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function criarCliente(opts: { nome: string; email: string; cpfCnpj?: string; telefone?: string }) {
  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: opts.nome,
      email: opts.email,
      cpfCnpj: opts.cpfCnpj || undefined,
      phone: opts.telefone || undefined,
    }),
  }) as Promise<{ id: string }>;
}

export async function criarAssinatura(opts: { customerId: string; valor: number; vencimento: string; descricao: string }) {
  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: opts.customerId,
      billingType: "UNDEFINED",
      value: opts.valor,
      nextDueDate: opts.vencimento,
      cycle: "MONTHLY",
      description: opts.descricao,
    }),
  }) as Promise<{ id: string }>;
}

export async function buscarPrimeiraFatura(subscriptionId: string) {
  const result = await asaasFetch(`/payments?subscription=${subscriptionId}&limit=1`) as {
    data: Array<{ id: string; invoiceUrl: string; status: string; value: number; dueDate: string }>;
  };
  return result.data[0];
}

export async function cancelarAssinatura(subscriptionId: string) {
  return asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
