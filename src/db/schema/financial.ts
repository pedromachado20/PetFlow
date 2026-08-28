import { pgTable, text, timestamp, numeric, boolean, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const transacaoTipoEnum = pgEnum("transacao_tipo", ["receita", "despesa"]);
export const transacaoStatusEnum = pgEnum("transacao_status", ["pendente", "pago", "cancelado"]);

export const transacoes = pgTable("transacoes", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tipo: transacaoTipoEnum("tipo").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  status: transacaoStatusEnum("status").notNull().default("pendente"),
  data: text("data").notNull(),
  dataVencimento: text("data_vencimento"),
  referencia: text("referencia"),
  pago: boolean("pago").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("transacoes_tenant_referencia_unique").on(t.tenantId, t.referencia),
]);

export type Transacao = typeof transacoes.$inferSelect;
export type NewTransacao = typeof transacoes.$inferInsert;
