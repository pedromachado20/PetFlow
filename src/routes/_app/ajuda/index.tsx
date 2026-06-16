import { createFileRoute } from "@tanstack/react-router";
import { Printer, BookOpen } from "lucide-react";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/ajuda/")({
  component: AjudaPage,
});

/* ── Impressão ────────────────────────────────────────────────────────── */

function imprimirManual() {
  const win = window.open("", "_blank");
  if (!win) { alert("Pop-up bloqueado. Permita pop-ups para imprimir."); return; }
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8">
<title>Manual do Usuário — PetFlow</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 30px 40px; line-height: 1.65; }
  h1 { font-size: 26px; color: #7c3aed; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
  h2 { font-size: 18px; color: #7c3aed; margin: 36px 0 10px; border-bottom: 2px solid #ede9fe; padding-bottom: 6px; page-break-after: avoid; }
  h3 { font-size: 14px; color: #333; margin: 20px 0 8px; font-weight: bold; }
  p { margin-bottom: 10px; }
  ol, ul { margin: 8px 0 12px 22px; }
  li { margin-bottom: 5px; }
  .dica { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 10px 14px; margin: 12px 0; border-radius: 0 6px 6px 0; }
  .dica strong { color: #16a34a; }
  .atencao { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin: 12px 0; border-radius: 0 6px 6px 0; }
  .atencao strong { color: #b45309; }
  .exemplo { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; margin: 12px 0; border-radius: 6px; font-size: 12px; }
  .exemplo strong { display: block; margin-bottom: 4px; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  .toc { background: #faf5ff; border: 1px solid #ede9fe; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px; }
  .toc h3 { margin-top: 0; color: #7c3aed; }
  .toc ol { margin-left: 18px; }
  .toc li { margin-bottom: 3px; font-size: 12px; }
  @media print {
    body { padding: 20px; font-size: 12px; }
    h2 { page-break-before: auto; }
    .dica, .atencao, .exemplo { page-break-inside: avoid; }
  }
</style>
</head><body>

<h1>🐾 PetFlow — Manual do Usuário</h1>
<p class="subtitle">Guia completo de treinamento · Versão 1.0</p>

<div class="toc">
<h3>Índice</h3>
<ol>
  <li>Bem-vindo ao PetFlow</li>
  <li>Conhecendo a Tela Principal</li>
  <li>Primeiros Passos</li>
  <li>Tutores — Cadastrando os Donos dos Pets</li>
  <li>Pets — Cadastrando os Animais</li>
  <li>Profissionais</li>
  <li>Serviços</li>
  <li>Produtos</li>
  <li>Agenda — Marcando Horários</li>
  <li>Caixa — Recebendo Pagamentos</li>
  <li>Atendimento Avulso</li>
  <li>Planos de Assinatura</li>
  <li>Financeiro</li>
  <li>Relatórios</li>
  <li>Configurações</li>
  <li>Dicas e Boas Práticas</li>
</ol>
</div>

<h2>1. Bem-vindo ao PetFlow</h2>
<p>O <strong>PetFlow</strong> é o sistema de gestão do seu pet shop. Com ele você consegue:</p>
<ul>
  <li>Cadastrar tutores (donos de pets) e seus animais</li>
  <li>Marcar horários de banho, tosa, consultas e outros serviços</li>
  <li>Receber pagamentos e controlar o caixa do dia</li>
  <li>Guardar o histórico de saúde de cada pet</li>
  <li>Vender produtos e controlar o financeiro</li>
  <li>Ver relatórios de quanto o pet shop faturou</li>
</ul>
<div class="dica"><strong>💡 Dica:</strong> Não se preocupe em decorar tudo de uma vez. Com o tempo, o uso diário torna tudo automático!</div>

<h2>2. Conhecendo a Tela Principal</h2>
<p>Quando você entra no sistema, verá duas partes principais:</p>
<h3>O Menu Lateral (à esquerda)</h3>
<p>É a "lista de opções" do sistema. Clicando em cada item você vai para uma tela diferente. Está organizado assim:</p>
<ul>
  <li><strong>Principal:</strong> Dashboard (resumo do dia), Agenda, Caixa</li>
  <li><strong>Cadastros:</strong> Tutores, Pets, Produtos</li>
  <li><strong>Serviços:</strong> Serviços, Profissionais, Planos</li>
  <li><strong>Gestão:</strong> Financeiro, Relatórios, Configurações</li>
</ul>
<div class="dica"><strong>💡 Dica:</strong> Você pode "encolher" o menu clicando na setinha pequena no lado direito dele, para ter mais espaço na tela.</div>

<h3>A Área Principal (ao centro/direita)</h3>
<p>É onde o conteúdo de cada tela aparece. Tudo o que você clicar no menu vai aparecer aqui.</p>

<h3>Botões mais usados</h3>
<ul>
  <li><strong>Botão roxo/colorido "+":</strong> Cria alguma coisa nova (novo tutor, novo serviço, etc.)</li>
  <li><strong>Lápis (✏️):</strong> Editar — muda as informações de algo que já existe</li>
  <li><strong>Lixeira (🗑️):</strong> Excluir — remove um item</li>
  <li><strong>Salvar:</strong> Confirma o que você digitou</li>
  <li><strong>Cancelar:</strong> Fecha sem salvar</li>
</ul>

<h2>3. Primeiros Passos — Configurando o Sistema</h2>
<p>Antes de usar o dia a dia, configure o sistema uma única vez. Siga esta ordem:</p>
<ol>
  <li>Vá em <strong>Configurações</strong> e coloque o nome do seu pet shop</li>
  <li>Vá em <strong>Profissionais</strong> e cadastre quem trabalha no pet shop (tosadores, veterinários, etc.)</li>
  <li>Vá em <strong>Serviços</strong> e cadastre o que o pet shop oferece (Banho, Tosa, Consulta, etc.) com os preços</li>
  <li>Vá em <strong>Produtos</strong> e cadastre os produtos que você vende (ração, shampoo, etc.)</li>
</ol>
<div class="atencao"><strong>⚠️ Atenção:</strong> Profissionais e Serviços precisam estar cadastrados antes de fazer qualquer agendamento.</div>

<h2>4. Tutores — Cadastrando os Donos dos Pets</h2>
<p>O <strong>Tutor</strong> é o dono do pet. Toda vez que um cliente novo vier ao pet shop, você cadastra ele como tutor.</p>
<h3>Como cadastrar um tutor:</h3>
<ol>
  <li>Clique em <strong>Tutores</strong> no menu</li>
  <li>Clique no botão <strong>"+ Novo Tutor"</strong></li>
  <li>Preencha o nome (obrigatório), telefone e e-mail</li>
  <li>Os outros campos (endereço, CPF) são opcionais</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplo:</strong>
Nome: Maria Silva · Telefone: (11) 98765-4321 · E-mail: maria@email.com</div>
<div class="dica"><strong>💡 Dica:</strong> Coloque sempre o telefone do tutor. Você vai precisar para confirmar agendamentos!</div>

<h3>Como buscar um tutor:</h3>
<ol>
  <li>Na tela de Tutores, há uma barra de pesquisa no topo</li>
  <li>Digite o nome ou telefone do cliente</li>
  <li>O sistema vai filtrar automaticamente enquanto você digita</li>
</ol>

<h2>5. Pets — Cadastrando os Animais</h2>
<p>Depois de cadastrar o tutor, você cadastra o pet dele. Um tutor pode ter vários pets.</p>
<h3>Como cadastrar um pet:</h3>
<ol>
  <li>Vá em <strong>Pets</strong> no menu</li>
  <li>Clique em <strong>"+ Novo Pet"</strong></li>
  <li>Escolha o <strong>Tutor</strong> (dono do pet) na lista</li>
  <li>Digite o nome do pet</li>
  <li>Escolha a espécie (cachorro, gato, etc.), raça, sexo e porte</li>
  <li>Data de nascimento ajuda a calcular a idade automaticamente</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplo:</strong>
Tutor: Maria Silva · Pet: Rex · Espécie: Cachorro · Raça: Labrador · Porte: Grande · Nascimento: 15/03/2020</div>

<h3>Prontuário do Pet</h3>
<p>Clicando no nome de um pet, você abre a <strong>ficha completa</strong> dele, que mostra:</p>
<ul>
  <li>Todas as informações cadastradas</li>
  <li>Histórico de vacinas</li>
  <li>Prontuário (consultas, diagnósticos, observações clínicas)</li>
</ul>
<div class="dica"><strong>💡 Dica:</strong> O prontuário é preenchido automaticamente quando você registra um Atendimento Avulso com laudo. Você também pode adicionar manualmente na ficha do pet.</div>

<h2>6. Profissionais</h2>
<p>São as pessoas que trabalham no pet shop e realizam os atendimentos.</p>
<h3>Como cadastrar um profissional:</h3>
<ol>
  <li>Vá em <strong>Profissionais</strong> no menu</li>
  <li>Clique em <strong>"+ Novo Profissional"</strong></li>
  <li>Digite o nome e escolha a especialidade (Veterinário, Tosador, Banhista, etc.)</li>
  <li>Adicione telefone e foto se quiser</li>
  <li>Defina os horários de trabalho de cada dia da semana</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplo:</strong>
Nome: João Tosador · Especialidade: Tosador · Horário: Segunda a Sexta, 08h às 18h</div>

<h2>7. Serviços</h2>
<p>São os procedimentos que o pet shop oferece, com preço e duração.</p>
<h3>Como cadastrar um serviço:</h3>
<ol>
  <li>Vá em <strong>Serviços</strong> no menu</li>
  <li>Clique em <strong>"+ Novo Serviço"</strong></li>
  <li>Digite o nome do serviço</li>
  <li>Escolha a categoria (Banho &amp; Tosa, Consulta Veterinária, Vacinação, etc.)</li>
  <li>Digite o preço em reais</li>
  <li>Defina a duração em minutos (ex: 60 minutos para um banho)</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplos de serviços:</strong><br>
• Banho Pequeno Porte — R$ 40,00 — 45 min<br>
• Tosa Higiênica — R$ 35,00 — 30 min<br>
• Consulta Veterinária — R$ 120,00 — 30 min<br>
• Vacinação V10 — R$ 85,00 — 15 min</div>

<h2>8. Produtos</h2>
<p>São os itens físicos que o pet shop vende aos clientes (ração, shampoo, brinquedos, etc.).</p>
<h3>Como cadastrar um produto:</h3>
<ol>
  <li>Vá em <strong>Produtos</strong> no menu</li>
  <li>Clique em <strong>"+ Novo Produto"</strong></li>
  <li>Digite o nome do produto</li>
  <li>Escolha a categoria (Alimentos, Higiene &amp; Beleza, Acessórios, etc.)</li>
  <li>Digite o preço de venda</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplos de produtos:</strong><br>
• Ração Golden Adulto 15kg — R$ 189,90 — Alimentos<br>
• Shampoo Neutro Pet — R$ 28,00 — Higiene &amp; Beleza<br>
• Coleira Ajustável P — R$ 22,00 — Acessórios</div>
<div class="dica"><strong>💡 Dica:</strong> Produtos cadastrados aparecem automaticamente no Caixa quando você vai fechar a conta de um cliente. Assim você pode incluir a venda junto com o serviço!</div>

<h2>9. Agenda — Marcando Horários</h2>
<p>A Agenda é onde você marca os agendamentos dos clientes. É como uma agenda de papel, mas no computador.</p>
<h3>Como fazer um agendamento:</h3>
<ol>
  <li>Vá em <strong>Agenda</strong> no menu</li>
  <li>Clique em <strong>"+ Agendamento"</strong></li>
  <li>Escolha o <strong>Tutor</strong> (dono do pet)</li>
  <li>Escolha o <strong>Pet</strong> que vai ser atendido</li>
  <li>Escolha o <strong>Serviço</strong> que será feito</li>
  <li>Escolha o <strong>Profissional</strong> que vai realizar</li>
  <li>Defina a <strong>Data</strong> e o <strong>Horário</strong></li>
  <li>O preço já aparece automaticamente, mas pode ser ajustado</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplo de agendamento:</strong><br>
Tutor: Maria Silva · Pet: Rex · Serviço: Banho Grande Porte<br>
Profissional: João Tosador · Data: 20/06/2025 · Horário: 10:00</div>

<h3>Status dos Agendamentos</h3>
<p>Cada agendamento passa por etapas. Para mudar o status, clique nos três pontinhos (···) no card do agendamento:</p>
<ul>
  <li><strong>Agendado:</strong> O horário foi marcado</li>
  <li><strong>Confirmado:</strong> O cliente confirmou que vai vir</li>
  <li><strong>Em Atendimento:</strong> O pet está sendo atendido agora</li>
  <li><strong>Concluído:</strong> O atendimento terminou — aparece no Caixa para pagamento</li>
  <li><strong>Cancelado / Faltou:</strong> O cliente cancelou ou não apareceu</li>
</ul>
<div class="atencao"><strong>⚠️ Atenção:</strong> Mude para "Concluído" quando o atendimento terminar. Só assim o cliente aparece no Caixa para receber o pagamento.</div>

<h2>10. Caixa — Recebendo Pagamentos</h2>
<p>O Caixa é onde você recebe o pagamento dos clientes depois que os serviços foram feitos.</p>
<h3>Como fechar o caixa de um cliente:</h3>
<ol>
  <li>Vá em <strong>Caixa</strong> no menu</li>
  <li>O sistema mostra todos os clientes com atendimentos do dia</li>
  <li>Clique no nome do cliente que vai pagar</li>
  <li>Do lado direito aparecem os serviços realizados e o valor total</li>
  <li>Se o cliente quiser comprar algum <strong>produto</strong>, clique em "+" ao lado do produto desejado</li>
  <li>Se houver <strong>desconto</strong>, coloque o valor no campo "Desconto (R$)"</li>
  <li>Escolha a <strong>forma de pagamento:</strong> Dinheiro, PIX, Débito ou Crédito</li>
  <li>Clique em <strong>"Fechar Caixa"</strong></li>
</ol>
<div class="dica"><strong>💡 Dica:</strong> Depois de pagar, você pode imprimir o <strong>Cupom Térmico</strong> (para impressora térmica) ou o <strong>Recibo PDF</strong> (para qualquer impressora).</div>

<h3>Navegando entre dias</h3>
<p>Use as setinhas (← →) no topo do Caixa para ver agendamentos de outros dias. O botão <strong>"Hoje"</strong> volta para o dia atual.</p>

<h2>11. Atendimento Avulso</h2>
<p>O Atendimento Avulso é para quando um cliente chega sem agendamento, ou para uma emergência.</p>
<h3>Como registrar um atendimento avulso:</h3>
<ol>
  <li>Vá em <strong>Caixa</strong> no menu</li>
  <li>Clique no botão <strong>"⚡ Atendimento Avulso"</strong></li>
  <li>Uma janela vai abrir. Siga os passos abaixo:</li>
</ol>

<h3>Se o cliente JÁ tem cadastro:</h3>
<ol>
  <li>Digite o nome dele na busca (a partir de 2 letras já aparece)</li>
  <li>Clique no nome do cliente na lista</li>
  <li>Escolha o pet dele</li>
  <li>Escolha o profissional que atendeu</li>
  <li>Selecione os serviços realizados</li>
  <li>Adicione produtos se necessário</li>
  <li>Preencha o laudo/observações se tiver algo importante</li>
  <li>Escolha a forma de pagamento e confirme</li>
</ol>
<div class="dica"><strong>💡 Dica:</strong> Para clientes cadastrados, o histórico do atendimento é salvo automaticamente no prontuário do pet!</div>

<h3>Se o cliente NÃO tem cadastro:</h3>
<ol>
  <li>Marque a caixa <strong>"Cliente sem cadastro"</strong></li>
  <li>Digite o nome do tutor (opcional, mas recomendado)</li>
  <li>Se digitou o nome, aparece um campo para o nome do pet — preencha</li>
  <li>O sistema vai <strong>cadastrar automaticamente</strong> o tutor e o pet ao confirmar</li>
  <li>Selecione os serviços, produtos e confirme o pagamento</li>
</ol>

<h3>Procedimentos que não estão na lista de serviços:</h3>
<p>Use a seção <strong>"Procedimentos / Itens Extras"</strong>:</p>
<ol>
  <li>Clique em <strong>"+ Adicionar"</strong></li>
  <li>Digite a descrição do procedimento (ex: "Cirurgia de emergência — hérnia")</li>
  <li>Digite o valor em reais</li>
  <li>Repita quantas vezes precisar</li>
</ol>
<div class="exemplo"><strong>Exemplo de cirurgia de emergência:</strong><br>
Procedimento: "Intervenção cirúrgica — torção gástrica" · Valor: R$ 1.200,00<br>
Laudo: "Pet deu entrada às 14h com torção gástrica. Cirurgia realizada com sucesso. Retorno em 7 dias para retirada dos pontos."</div>

<h2>12. Planos de Assinatura</h2>
<p>Planos são pacotes mensais que os clientes podem assinar. Por exemplo: "Plano Banho Mensal — 4 banhos por mês por R$ 120,00".</p>
<h3>Como criar um plano:</h3>
<ol>
  <li>Vá em <strong>Planos</strong> no menu</li>
  <li>Clique em <strong>"+ Novo Plano"</strong></li>
  <li>Dê um nome ao plano e defina o valor mensal</li>
  <li>Descreva o que inclui e quantos serviços estão incluídos</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<h3>Como assinar um cliente em um plano:</h3>
<ol>
  <li>Na tela de Planos, clique no plano desejado</li>
  <li>Clique em <strong>"+ Nova Assinatura"</strong></li>
  <li>Escolha o tutor e o pet</li>
  <li>Defina a data de início</li>
  <li>Salve — o cliente ficará como assinante ativo</li>
</ol>

<h2>13. Financeiro</h2>
<p>O Financeiro mostra todo o dinheiro que entrou e saiu do pet shop no mês.</p>
<h3>O que você vê na tela:</h3>
<ul>
  <li><strong>Receitas do Mês:</strong> Tudo que entrou (em verde)</li>
  <li><strong>Despesas do Mês:</strong> Tudo que saiu (em vermelho)</li>
  <li><strong>Saldo:</strong> Receitas menos despesas</li>
</ul>
<div class="dica"><strong>💡 Dica:</strong> Quando você fecha o Caixa, a receita já entra automaticamente no Financeiro. Não precisa lançar duas vezes!</div>

<h3>Como lançar uma despesa:</h3>
<ol>
  <li>Clique em <strong>"+ Lançamento"</strong></li>
  <li>Escolha o tipo: <strong>Despesa</strong></li>
  <li>Escolha a categoria (Salários, Aluguel, Produtos, etc.)</li>
  <li>Descreva o que foi pago</li>
  <li>Coloque o valor e a data</li>
  <li>Clique em <strong>Salvar</strong></li>
</ol>
<div class="exemplo"><strong>Exemplo de despesa:</strong>
Tipo: Despesa · Categoria: Aluguel · Descrição: "Aluguel julho/2025" · Valor: R$ 2.500,00 · Data: 05/07/2025</div>
<div class="dica"><strong>💡 Dica:</strong> Clique em <strong>"PDF"</strong> para gerar um relatório impresso de todos os lançamentos do mês.</div>

<h2>14. Relatórios</h2>
<p>A tela de Relatórios mostra um resumo do desempenho do pet shop no mês atual.</p>
<h3>O que você encontra:</h3>
<ul>
  <li><strong>Pets Cadastrados:</strong> Quantos pets estão no sistema</li>
  <li><strong>Tutores:</strong> Quantos clientes você tem</li>
  <li><strong>Agendamentos no Mês:</strong> Quantos atendimentos foram feitos este mês</li>
  <li><strong>Assinaturas Ativas:</strong> Quantos clientes têm plano ativo</li>
  <li><strong>Receita do Mês:</strong> Quanto o pet shop faturou</li>
  <li><strong>Top Serviços:</strong> Os 5 serviços mais realizados no mês (com barra de progresso)</li>
</ul>
<div class="dica"><strong>💡 Dica:</strong> Use o Relatório de Top Serviços para saber quais serviços fazem mais sucesso e planejar promoções!</div>

<h2>15. Configurações</h2>
<p>Aqui você personaliza o sistema com as informações do seu pet shop.</p>
<h3>O que você pode configurar:</h3>
<ul>
  <li><strong>Nome do Pet Shop:</strong> Aparece nos cupons e recibos</li>
  <li><strong>Logo:</strong> Imagem da sua marca</li>
  <li><strong>WhatsApp Business:</strong> Para envio de lembretes automáticos de agendamento</li>
</ul>
<div class="atencao"><strong>⚠️ Atenção:</strong> O nome do pet shop é muito importante — ele aparece em todos os documentos impressos (cupom, recibo). Confira se está certo!</div>

<h2>16. Dicas e Boas Práticas</h2>
<h3>Ordem certa para o dia a dia:</h3>
<ol>
  <li>De manhã, abra a <strong>Agenda</strong> e veja quem está marcado no dia</li>
  <li>Quando o pet chegar, mude o status para <strong>"Em Atendimento"</strong></li>
  <li>Quando terminar, mude para <strong>"Concluído"</strong></li>
  <li>Quando o dono vier pagar, vá no <strong>Caixa</strong> e feche a conta</li>
  <li>Imprima o cupom para o cliente</li>
</ol>

<h3>Dicas de segurança:</h3>
<ul>
  <li>Nunca compartilhe sua senha com ninguém</li>
  <li>Sempre feche o sistema quando sair do computador</li>
  <li>Em caso de dúvida, não exclua nada — fale com o responsável</li>
</ul>

<h3>Erros mais comuns:</h3>
<ul>
  <li><strong>"Não consigo fazer agendamento":</strong> Verifique se o profissional e o serviço estão cadastrados</li>
  <li><strong>"O cliente não aparece no Caixa":</strong> O agendamento precisa estar com status "Concluído"</li>
  <li><strong>"Não encontro o cliente":</strong> Procure pelo telefone em vez do nome, ou verifique se está cadastrado</li>
  <li><strong>"O valor do produto não aparece no total":</strong> Clique no "+" do produto para adicioná-lo ao carrinho</li>
</ul>

<div class="dica"><strong>🐾 Parabéns!</strong> Você chegou ao final do manual. Com a prática diária, tudo ficará fácil e natural. Bom trabalho!</div>

<p style="margin-top:40px;text-align:center;font-size:11px;color:#aaa">PetFlow — Manual do Usuário · Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

/* ── Componentes de conteúdo ──────────────────────────────────────────── */

function Dica({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border-l-4 border-green-500 px-4 py-3 rounded-r-lg my-3 text-sm text-green-900">
      <span className="font-semibold">💡 Dica: </span>{children}
    </div>
  );
}

function Atencao({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r-lg my-3 text-sm text-amber-900">
      <span className="font-semibold">⚠️ Atenção: </span>{children}
    </div>
  );
}

function Exemplo({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 my-3 text-sm">
      {titulo && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{titulo}</p>}
      <p className="text-slate-700">{children}</p>
    </div>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section id={`sec-${numero}`} className="scroll-mt-6">
      <h2 className="text-xl font-bold text-primary mt-10 mb-4 pb-2 border-b-2 border-primary/20 flex items-center gap-2">
        <span className="bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-black shrink-0">{numero}</span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function Passos({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
}

/* ── Página principal ─────────────────────────────────────────────────── */

function AjudaPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-2">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">Manual do Usuário</h1>
            <p className="text-sm text-muted-foreground">Guia completo de treinamento do PetFlow</p>
          </div>
        </div>
        <Button variant="outline" onClick={imprimirManual} className="shrink-0">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Índice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-primary mb-3">Índice</p>
        <div className="grid grid-cols-2 gap-1 text-sm">
          {[
            [1, "Bem-vindo ao PetFlow"],
            [2, "Conhecendo a Tela Principal"],
            [3, "Primeiros Passos"],
            [4, "Tutores"],
            [5, "Pets"],
            [6, "Profissionais"],
            [7, "Serviços"],
            [8, "Produtos"],
            [9, "Agenda"],
            [10, "Caixa"],
            [11, "Atendimento Avulso"],
            [12, "Planos de Assinatura"],
            [13, "Financeiro"],
            [14, "Relatórios"],
            [15, "Configurações"],
            [16, "Dicas e Boas Práticas"],
          ].map(([n, t]) => (
            <a key={n} href={`#sec-${n}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
              <span className="text-primary font-bold text-xs w-5 shrink-0">{n}.</span> {t}
            </a>
          ))}
        </div>
      </div>

      {/* ── Seções ─────────────────────────────────────────────────── */}

      <Secao numero={1} titulo="Bem-vindo ao PetFlow">
        <p>O <strong>PetFlow</strong> é o sistema de gestão do seu pet shop. Com ele você consegue:</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li>Cadastrar clientes (tutores) e seus animais</li>
          <li>Marcar horários de banho, tosa, consultas e outros serviços</li>
          <li>Receber pagamentos e controlar o caixa do dia</li>
          <li>Guardar o histórico de saúde de cada pet</li>
          <li>Vender produtos e controlar o financeiro</li>
          <li>Ver relatórios de quanto o pet shop faturou</li>
        </ul>
        <Dica>Não se preocupe em aprender tudo de uma vez. Com o uso diário, tudo se torna automático!</Dica>
      </Secao>

      <Secao numero={2} titulo="Conhecendo a Tela Principal">
        <p><strong>Menu Lateral (à esquerda):</strong> É a lista de opções do sistema. Está dividido em grupos:</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><strong>Principal:</strong> Dashboard, Agenda, Caixa</li>
          <li><strong>Cadastros:</strong> Tutores, Pets, Produtos</li>
          <li><strong>Serviços:</strong> Serviços, Profissionais, Planos</li>
          <li><strong>Gestão:</strong> Financeiro, Relatórios, Configurações</li>
        </ul>
        <p><strong>Botões mais usados:</strong></p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><strong>Botão com "+":</strong> Cria algo novo</li>
          <li><strong>Lápis ✏️:</strong> Editar informações existentes</li>
          <li><strong>Lixeira 🗑️:</strong> Excluir um item</li>
        </ul>
        <Dica>Você pode encolher o menu clicando na setinha pequena no lado direito dele, para ter mais espaço na tela.</Dica>
      </Secao>

      <Secao numero={3} titulo="Primeiros Passos — Configurando o Sistema">
        <p>Antes de usar o dia a dia, configure o sistema uma única vez, nesta ordem:</p>
        <Passos items={[
          "Vá em <strong>Configurações</strong> e coloque o nome do seu pet shop",
          "Vá em <strong>Profissionais</strong> e cadastre quem trabalha (tosadores, veterinários, etc.)",
          "Vá em <strong>Serviços</strong> e cadastre o que o pet shop oferece com os preços",
          "Vá em <strong>Produtos</strong> e cadastre os produtos que você vende",
        ]} />
        <Atencao>Profissionais e Serviços precisam estar cadastrados antes de fazer qualquer agendamento.</Atencao>
      </Secao>

      <Secao numero={4} titulo="Tutores — Cadastrando os Donos dos Pets">
        <p>O <strong>Tutor</strong> é o dono do pet. Quando um cliente novo aparecer, você cadastra ele como tutor.</p>
        <Passos items={[
          "Clique em <strong>Tutores</strong> no menu",
          "Clique no botão <strong>'+ Novo Tutor'</strong>",
          "Preencha o nome (obrigatório) e o telefone",
          "E-mail e endereço são opcionais",
          "Clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplo">Nome: Maria Silva · Telefone: (11) 98765-4321 · E-mail: maria@email.com</Exemplo>
        <Dica>Sempre coloque o telefone do tutor — você vai precisar para confirmar agendamentos!</Dica>
      </Secao>

      <Secao numero={5} titulo="Pets — Cadastrando os Animais">
        <p>Depois de cadastrar o tutor, cadastre o pet. Um tutor pode ter vários pets.</p>
        <Passos items={[
          "Vá em <strong>Pets</strong> no menu",
          "Clique em <strong>'+ Novo Pet'</strong>",
          "Escolha o <strong>Tutor</strong> (dono do pet) na lista",
          "Digite o nome do pet e escolha a espécie, raça, sexo e porte",
          "A data de nascimento calcula a idade automaticamente",
          "Clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplo">Tutor: Maria Silva · Pet: Rex · Espécie: Cachorro · Raça: Labrador · Porte: Grande</Exemplo>
        <p>Clicando no nome do pet, você abre a <strong>ficha completa</strong> com histórico de vacinas e prontuário.</p>
        <Dica>O prontuário é preenchido automaticamente quando você registra um Atendimento Avulso com laudo.</Dica>
      </Secao>

      <Secao numero={6} titulo="Profissionais">
        <Passos items={[
          "Vá em <strong>Profissionais</strong> no menu e clique em <strong>'+ Novo Profissional'</strong>",
          "Digite o nome e escolha a especialidade (Veterinário, Tosador, Banhista, etc.)",
          "Defina os horários de trabalho de cada dia da semana",
          "Adicione foto se quiser e clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplo">João Tosador · Especialidade: Tosador · Horário: Segunda a Sexta, 08h às 18h</Exemplo>
      </Secao>

      <Secao numero={7} titulo="Serviços">
        <p>São os procedimentos que o pet shop oferece, com preço e duração.</p>
        <Passos items={[
          "Vá em <strong>Serviços</strong> e clique em <strong>'+ Novo Serviço'</strong>",
          "Digite o nome, escolha a categoria e defina o preço",
          "Coloque a duração em minutos (ex: 60 minutos para um banho)",
          "Clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplos de serviços">
          {"Banho Pequeno Porte — R$ 40,00 — 45 min\nTosa Higiênica — R$ 35,00 — 30 min\nConsulta Veterinária — R$ 120,00 — 30 min"}
        </Exemplo>
      </Secao>

      <Secao numero={8} titulo="Produtos">
        <p>Itens físicos que o pet shop vende (ração, shampoo, brinquedos, etc.).</p>
        <Passos items={[
          "Vá em <strong>Produtos</strong> e clique em <strong>'+ Novo Produto'</strong>",
          "Digite o nome, escolha a categoria e o preço de venda",
          "Clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplos">
          {"Ração Golden Adulto 15kg — R$ 189,90 — Alimentos\nShampoo Neutro Pet — R$ 28,00 — Higiene & Beleza"}
        </Exemplo>
        <Dica>Produtos aparecem automaticamente no Caixa para você adicionar junto com o serviço na hora do pagamento.</Dica>
      </Secao>

      <Secao numero={9} titulo="Agenda — Marcando Horários">
        <Passos items={[
          "Vá em <strong>Agenda</strong> e clique em <strong>'+ Agendamento'</strong>",
          "Escolha o Tutor, o Pet, o Serviço e o Profissional",
          "Defina a data e o horário — o preço já aparece automaticamente",
          "Clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplo">Maria Silva · Rex · Banho Grande Porte · João Tosador · 20/06/2025 às 10:00</Exemplo>
        <p className="font-semibold mt-4">Status dos agendamentos (clique nos três pontinhos ··· para mudar):</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><strong>Agendado →</strong> Horário marcado</li>
          <li><strong>Confirmado →</strong> Cliente confirmou que vem</li>
          <li><strong>Em Atendimento →</strong> Pet está sendo atendido agora</li>
          <li><strong>Concluído →</strong> Atendimento terminou — aparece no Caixa</li>
          <li><strong>Cancelado / Faltou →</strong> Cliente não veio</li>
        </ul>
        <Atencao>Mude para "Concluído" quando terminar o atendimento. Só assim o cliente aparece no Caixa para pagar!</Atencao>
      </Secao>

      <Secao numero={10} titulo="Caixa — Recebendo Pagamentos">
        <Passos items={[
          "Vá em <strong>Caixa</strong> no menu",
          "Clique no nome do cliente que vai pagar (aparece na lista à esquerda)",
          "Os serviços realizados e o valor total aparecem à direita",
          "Se quiser adicionar um produto, clique no <strong>'+'</strong> ao lado do produto",
          "Se houver desconto, digite o valor no campo <strong>'Desconto (R$)'</strong>",
          "Escolha a forma de pagamento: Dinheiro, PIX, Débito ou Crédito",
          "Clique em <strong>'Fechar Caixa'</strong>",
        ]} />
        <Dica>Após pagar, clique em "Cupom Térmico" (impressora de cupom) ou "Recibo PDF" (qualquer impressora) para entregar o comprovante ao cliente.</Dica>
      </Secao>

      <Secao numero={11} titulo="Atendimento Avulso">
        <p>Para clientes que chegam sem agendamento ou em emergência.</p>
        <Passos items={[
          "No <strong>Caixa</strong>, clique em <strong>'⚡ Atendimento Avulso'</strong>",
          "Uma janela vai abrir com o formulário completo",
        ]} />
        <p className="font-semibold">Cliente já cadastrado:</p>
        <p>Digite o nome na busca, selecione o tutor, escolha o pet e o profissional, marque os serviços e confirme.</p>
        <p className="font-semibold mt-3">Cliente sem cadastro:</p>
        <p>Marque "Cliente sem cadastro", digite o nome e o nome do pet. O sistema cadastra ambos automaticamente!</p>
        <p className="font-semibold mt-3">Procedimentos que não estão na lista:</p>
        <p>Use "Procedimentos / Itens Extras", clique em "+ Adicionar", escreva a descrição e o valor.</p>
        <Exemplo titulo="Exemplo de emergência">
          {"Procedimento: Cirurgia de emergência — torção gástrica · R$ 1.200,00\nLaudo: Pet deu entrada às 14h. Cirurgia realizada com sucesso. Retorno em 7 dias."}
        </Exemplo>
        <Dica>Para clientes cadastrados, o laudo é salvo automaticamente no prontuário do pet!</Dica>
      </Secao>

      <Secao numero={12} titulo="Planos de Assinatura">
        <p>Pacotes mensais para clientes fiéis (ex: "4 banhos por mês — R$ 120,00/mês").</p>
        <Passos items={[
          "Vá em <strong>Planos</strong> e clique em <strong>'+ Novo Plano'</strong>",
          "Defina o nome, valor mensal e o que está incluído",
          "Para assinar um cliente: clique no plano e em <strong>'+ Nova Assinatura'</strong>",
          "Escolha o tutor, o pet e a data de início",
        ]} />
      </Secao>

      <Secao numero={13} titulo="Financeiro">
        <p>Controle de receitas (dinheiro que entrou) e despesas (dinheiro que saiu).</p>
        <Dica>Quando você fecha o Caixa, a receita entra automaticamente no Financeiro. Não precisa lançar duas vezes!</Dica>
        <p className="font-semibold">Para lançar uma despesa:</p>
        <Passos items={[
          "Clique em <strong>'+ Lançamento'</strong>",
          "Escolha o tipo <strong>Despesa</strong>, a categoria e descreva o que foi pago",
          "Coloque o valor e a data e clique em <strong>Salvar</strong>",
        ]} />
        <Exemplo titulo="Exemplo de despesa">Aluguel julho/2025 · R$ 2.500,00 · Categoria: Aluguel</Exemplo>
        <Dica>Clique em "PDF" para gerar um relatório impresso de todos os lançamentos do mês.</Dica>
      </Secao>

      <Secao numero={14} titulo="Relatórios">
        <p>Resumo do desempenho do pet shop no mês atual:</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><strong>Pets e Tutores:</strong> Quantos estão cadastrados</li>
          <li><strong>Agendamentos no Mês:</strong> Quantos atendimentos foram feitos</li>
          <li><strong>Receita do Mês:</strong> Quanto o pet shop faturou</li>
          <li><strong>Top Serviços:</strong> Os 5 serviços mais realizados com gráfico de barras</li>
        </ul>
        <Dica>Use o Top Serviços para saber o que faz mais sucesso e planejar promoções!</Dica>
      </Secao>

      <Secao numero={15} titulo="Configurações">
        <p>Personalize o sistema com as informações do seu pet shop.</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><strong>Nome do Pet Shop:</strong> Aparece em todos os cupons e recibos</li>
          <li><strong>Logo:</strong> Imagem da sua marca</li>
          <li><strong>WhatsApp:</strong> Para envio de lembretes automáticos</li>
        </ul>
        <Atencao>Confira se o nome do pet shop está correto — ele aparece em todos os documentos impressos!</Atencao>
      </Secao>

      <Secao numero={16} titulo="Dicas e Boas Práticas">
        <p className="font-semibold">Rotina ideal do dia a dia:</p>
        <Passos items={[
          "Abra a <strong>Agenda</strong> pela manhã e veja quem está marcado no dia",
          "Quando o pet chegar, mude o status para <strong>'Em Atendimento'</strong>",
          "Quando terminar, mude para <strong>'Concluído'</strong>",
          "Quando o dono vier pagar, vá no <strong>Caixa</strong> e feche a conta",
          "Imprima o cupom e entregue ao cliente",
        ]} />
        <p className="font-semibold mt-4">Erros mais comuns:</p>
        <ul className="list-disc pl-6 space-y-2 my-2">
          <li><strong>"Não consigo agendar":</strong> Verifique se o profissional e o serviço estão cadastrados</li>
          <li><strong>"Cliente não aparece no Caixa":</strong> O agendamento precisa estar com status "Concluído"</li>
          <li><strong>"Não encontro o cliente":</strong> Busque pelo telefone ou verifique se está cadastrado</li>
          <li><strong>"Produto não entra no total":</strong> Clique no "+" do produto para adicioná-lo</li>
        </ul>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-4 text-center">
          <p className="text-lg">🐾</p>
          <p className="font-semibold text-primary">Parabéns! Você chegou ao final do manual.</p>
          <p className="text-sm text-muted-foreground mt-1">Com a prática diária, tudo ficará fácil e natural. Bom trabalho!</p>
        </div>
      </Secao>

      <div className="pt-6 pb-2 text-center text-xs text-muted-foreground border-t border-border mt-8">
        PetFlow — Manual do Usuário · Para imprimir ou salvar como PDF, clique no botão acima
      </div>
    </div>
  );
}
