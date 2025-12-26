import { SupabaseClient } from "@supabase/supabase-js";
import z from "zod";
import { Database } from "../../../../database/src/types";
import { AccountingEntityType, EntityMap } from "../entities";
import { AccountingProvider } from "../providers";
import { ProviderCredentialsSchema, ProviderID } from "./models";

export const AccountingSyncSchema = z.object({
  companyId: z.string(),
  provider: z.nativeEnum(ProviderID),
  syncType: z.enum(["webhook", "scheduled", "trigger"]),
  syncDirection: z.enum(["from-accounting", "to-accounting", "bi-directional"]),
  entities: z.array(z.custom<AccountingEntity>()),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
});

export type AccountingSyncPayload = z.infer<typeof AccountingSyncSchema>;

export type SyncFn = <T = unknown>(input: {
  client: SupabaseClient<Database>;
  entity: AccountingEntity;
  provider: AccountingProvider;
  payload: AccountingSyncPayload;
}) => T | Promise<T>;

/**
 *  {
  companyId: string;
  provider: AccountingProvider;
  syncType: "webhook" | "scheduled" | "trigger";
  syncDirection: "from-accounting" | "to-accounting" | "bi-directional";
  entities: AccountingEntity[];
  metadata?: {
    tenantId?: string;
    webhookId?: string;
    userId?: string;
    [key: string]: any;
  };

 */

export interface AccountingEntity<
  T extends AccountingEntityType = AccountingEntityType
> {
  entityType: T;
  entityId: string;
  operation: "create" | "update" | "delete" | "sync";
  lastSyncedAt?: string;
  data?: Partial<EntityMap[T]>;
}
