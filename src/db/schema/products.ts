import { pgTable, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const produtos = pgTable("produtos", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull().default("geral"),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Produto = typeof produtos.$inferSelect;
export type NewProduto = typeof produtos.$inferInsert;
