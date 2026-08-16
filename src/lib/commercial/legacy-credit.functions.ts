import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const legacyCreditSchema = z.object({
  lojas: z.array(
    z.object({
      id: z.string().min(1),
      nome: z.string().trim().min(2),
      creditoInicial: z.number().nonnegative(),
      saldo: z.number().nonnegative(),
    }),
  ),
  lancamentos: z.array(
    z.object({
      lojaId: z.string().min(1),
      status: z.string(),
      data: z.string().optional(),
      numeroNota: z.string().optional(),
      descricao: z.string().optional(),
      valor: z.number().positive(),
      fileHash: z.string().regex(/^[a-f0-9]{64}$/i),
      criadoEm: z.string().datetime().optional(),
      saldoAnterior: z.number().nonnegative().optional(),
      saldoPosterior: z.number().nonnegative().optional(),
    }),
  ),
});

export const importLegacyStoreCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => legacyCreditSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("import_legacy_store_credits", {
      _payload: data,
    });
    if (error) throw error;
    return result as { importedStores: number; importedTransactions: number };
  });
