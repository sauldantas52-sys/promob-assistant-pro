
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const operatorAuthSchema = z.object({
  operatorCode: z.string().min(1),
  pin: z.string().min(4).max(20),
});

async function hashPin(pin: string) {
  const msgUint8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPin(pin: string, hash: string | null) {
  if (!hash) return false;
  const currentHash = await hashPin(pin);
  return currentHash === hash;
}

export const authenticateOperator = createServerFn({ method: "POST" })
  .validator((data: unknown) => operatorAuthSchema.parse(data))
  .handler(async ({ data: { operatorCode, pin } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, pin_hash, locked_until, failed_attempts, company_id, full_name")
      .eq("operator_code", operatorCode)
      .maybeSingle();

    if (profileError || !profile) {
      return { success: false, error: "Código do operador não encontrado." };
    }

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      return { success: false, error: "Conta bloqueada. Tente novamente mais tarde." };
    }

    const isValid = await verifyPin(pin, profile.pin_hash);

    if (!isValid) {
      const attempts = (profile.failed_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      
      await supabaseAdmin.from("profiles").update({
        failed_attempts: attempts,
        locked_until: lockedUntil
      }).eq("id", profile.id);

      await supabaseAdmin.from("operator_login_logs").insert({
        profile_id: profile.id,
        operator_code: operatorCode,
        company_id: profile.company_id,
        status: lockedUntil ? 'locked' : 'failed'
      });

      return { 
        success: false, 
        error: lockedUntil ? "Muitas tentativas. Bloqueado por 15 minutos." : "PIN incorreto." 
      };
    }

    const { data: secret, error: secretError } = await supabaseAdmin
      .from("operator_secrets")
      .select("secret_password")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (secretError || !secret) {
      return { success: false, error: "Erro interno: Credenciais operacionais não configuradas." };
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userError || !user) {
       return { success: false, error: "Usuário não encontrado no sistema de autenticação." };
    }

    await supabaseAdmin.from("profiles").update({
      failed_attempts: 0,
      locked_until: null
    }).eq("id", profile.id);

    await supabaseAdmin.from("operator_login_logs").insert({
      profile_id: profile.id,
      operator_code: operatorCode,
      company_id: profile.company_id,
      status: 'success'
    });

    return {
      success: true,
      email: user.email,
      password: secret.secret_password
    };
  });

export const setOperatorCredentials = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    profileId: z.string().uuid(),
    operatorCode: z.string().min(1),
    pin: z.string().min(4).max(20),
    realPassword: z.string().min(8)
  }).parse(data))
  .handler(async ({ data }) => {
     const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

     const pinHash = await hashPin(data.pin);

     const { error: profileError } = await supabaseAdmin.from("profiles").update({
       operator_code: data.operatorCode,
       pin_hash: pinHash
     }).eq("id", data.profileId);

     if (profileError) throw profileError;

     const { error: secretError } = await supabaseAdmin.from("operator_secrets").upsert({
       profile_id: data.profileId,
       secret_password: data.realPassword
     });

     if (secretError) throw secretError;

     return { success: true };
  });

export const createOperator = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    role: z.string(),
    companyId: z.string().uuid(),
    operatorCode: z.string().min(1),
    pin: z.string().min(4).max(20),
    internalPassword: z.string().min(12)
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create Supabase Auth user with a strong internal password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.internalPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. Set profile & role
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: data.companyId,
      full_name: data.fullName,
      operator_code: data.operatorCode,
      pin_hash: await hashPin(data.pin)
    });

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.role as any
    });

    // 3. Store internal password in operator_secrets
    await supabaseAdmin.from("operator_secrets").insert({
      profile_id: userId,
      secret_password: data.internalPassword
    });

    return { success: true, userId };
  });
