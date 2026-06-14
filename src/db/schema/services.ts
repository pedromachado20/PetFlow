import { pgTable, text, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria").notNull().default("banho_tosa"),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  duracao: integer("duracao").notNull().default(60),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
