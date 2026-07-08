export async function enviarEmail(opts: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Erro Resend ${res.status}`);
  }

  return res.json();
}

export function emailTrialAcabando(nomePetShop: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #7c3aed;">Seu teste grátis do PetFlow acaba amanhã</h2>
      <p>Olá, ${nomePetShop}!</p>
      <p>Seu período de teste gratuito do PetFlow termina <strong>amanhã</strong>. Depois disso, o acesso ao sistema fica bloqueado até a assinatura ser ativada.</p>
      <p>Para continuar usando a agenda, caixa, financeiro e demais módulos sem interrupção, acesse a página de Assinatura e assine o plano.</p>
      <p style="margin-top: 24px;">
        <a href="https://petflow.nexusteck.com.br/assinatura" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Assinar agora</a>
      </p>
      <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Seus dados continuam guardados mesmo se a assinatura ficar em atraso.</p>
    </div>
  `;
}
