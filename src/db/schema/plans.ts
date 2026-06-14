import { pgTable, text, timestamp, boolean, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tutores } from "./tutores";
import { pets } from "./pets";

export const planTipoEnum = pgEnum("plan_tipo", ["ilimitado", "limitado", "premium"]);
export const assinaturaStatusEnum = pgEnum("assinatura_status", ["ativa", "suspensa", "cancelada", "inadimplente"]);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipo: planTipoEnum("tipo").notNull().default("limitado"),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  limite: integer("limite"),
  cor: text("cor").notNull().default("#0ea5e9"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assinaturas = pgTable("assinaturas", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tutorId: text("tutor_id").notNull().references(() => tutores.id, { onDelete: "cascade" }),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  status: assinaturaStatusEnum("status").notNull().default("ativa"),
  dataInicio: text("data_inicio").notNull(),
  dataVencimento: text("data_vencimento").notNull(),
  usosNoMes: integer("usos_no_mes").notNull().default(0),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Assinatura = typeof assinaturas.$inferSelect;
export type NewAssinatura = typeof assinaturas.$inferInsert;
