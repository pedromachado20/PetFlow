import { relations } from "drizzle-orm";
import {
  tenants, users, sessions, accounts,
  professionals, workingHours,
  services,
  tutores,
  pets,
  appointments,
  vacinas, prontuarios,
  plans, assinaturas,
  transacoes,
} from "./schema";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  professionals: many(professionals),
  services: many(services),
  tutores: many(tutores),
  pets: many(pets),
  appointments: many(appointments),
  vacinas: many(vacinas),
  prontuarios: many(prontuarios),
  plans: many(plans),
  assinaturas: many(assinaturas),
  transacoes: many(transacoes),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [professionals.tenantId], references: [tenants.id] }),
  workingHours: many(workingHours),
  appointments: many(appointments),
  vacinas: many(vacinas),
  prontuarios: many(prontuarios),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  professional: one(professionals, { fields: [workingHours.professionalId], references: [professionals.id] }),
  tenant: one(tenants, { fields: [workingHours.tenantId], references: [tenants.id] }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  appointments: many(appointments),
}));

export const tutoresRelations = relations(tutores, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tutores.tenantId], references: [tenants.id] }),
  pets: many(pets),
  appointments: many(appointments),
  assinaturas: many(assinaturas),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  tenant: one(tenants, { fields: [pets.tenantId], references: [tenants.id] }),
  tutor: one(tutores, { fields: [pets.tutorId], references: [tutores.id] }),
  appointments: many(appointments),
  vacinas: many(vacinas),
  prontuarios: many(prontuarios),
  assinaturas: many(assinaturas),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  tenant: one(tenants, { fields: [appointments.tenantId], references: [tenants.id] }),
  tutor: one(tutores, { fields: [appointments.tutorId], references: [tutores.id] }),
  pet: one(pets, { fields: [appointments.petId], references: [pets.id] }),
  professional: one(professionals, { fields: [appointments.professionalId], references: [professionals.id] }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
}));

export const vacinasRelations = relations(vacinas, ({ one }) => ({
  tenant: one(tenants, { fields: [vacinas.tenantId], references: [tenants.id] }),
  pet: one(pets, { fields: [vacinas.petId], references: [pets.id] }),
  profissional: one(professionals, { fields: [vacinas.profissionalId], references: [professionals.id] }),
}));

export const prontuariosRelations = relations(prontuarios, ({ one }) => ({
  tenant: one(tenants, { fields: [prontuarios.tenantId], references: [tenants.id] }),
  pet: one(pets, { fields: [prontuarios.petId], references: [pets.id] }),
  profissional: one(professionals, { fields: [prontuarios.profissionalId], references: [professionals.id] }),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  tenant: one(tenants, { fields: [plans.tenantId], references: [tenants.id] }),
  assinaturas: many(assinaturas),
}));

export const assinaturasRelations = relations(assinaturas, ({ one }) => ({
  tenant: one(tenants, { fields: [assinaturas.tenantId], references: [tenants.id] }),
  tutor: one(tutores, { fields: [assinaturas.tutorId], references: [tutores.id] }),
  pet: one(pets, { fields: [assinaturas.petId], references: [pets.id] }),
  plan: one(plans, { fields: [assinaturas.planId], references: [plans.id] }),
}));

export const transacoesRelations = relations(transacoes, ({ one }) => ({
  tenant: one(tenants, { fields: [transacoes.tenantId], references: [tenants.id] }),
}));
