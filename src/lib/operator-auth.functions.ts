import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const companyUserRoles = [
  "admin",
  "projetista",
  "comercial",
  "escritorio",
  "fabrica",
  "montador",
  "auditor",
] as const;

export type CompanyUserRole = (typeof companyUserRoles)[number];

const roleSchema = z.enum(companyUserRoles);
const operatorCodeSchema = z
  .string()
  .trim()
  .min(1, "Informe o código ou matrícula.")
  .max(50)
  .regex(/^[A-Za-z0-9._/-]+$/, "Use apenas letras, números, ponto, hífen, barra ou sublinhado.");
const pinSchema = z.string().regex(/^\d{8,20}$/, "O PIN deve ter de 8 a 20 dígitos.");
const fullNameSchema = z.string().trim().min(2, "Informe o nome completo.").max(120);
const operatorAuthSchema = z.object({
  operatorCode: z.string().trim().min(1).transform(normalizeOperatorCode),
  pin: z.string().min(4).max(20),
});
const createCompanyUserSchema = z.object({
  fullName: fullNameSchema,
  operatorCode: operatorCodeSchema,
  pin: pinSchema,
  role: roleSchema,
});
const updateCompanyUserSchema = z
  .object({
    userId: z.string().uuid(),
    fullName: fullNameSchema.optional(),
    operatorCode: operatorCodeSchema.optional(),
    pin: pinSchema.optional(),
    role: roleSchema.optional(),
    blocked: z.boolean().optional(),
  })
  .refine(
    ({ fullName, operatorCode, pin, role, blocked }) =>
      fullName !== undefined ||
      operatorCode !== undefined ||
      pin !== undefined ||
      role !== undefined ||
      blocked !== undefined,
    "Nenhuma alteração foi informada.",
  );

type StoredRole = Database["public"]["Enums"]["app_role"];
const AUTH_FAILURE = "Código ou PIN inválido.";
const PIN_HASH_ITERATIONS = 210_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function hashValue(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

async function hashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PIN_HASH_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2-sha256$${PIN_HASH_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(derived))}`;
}

async function verifyPin(pin: string, hash: string | null) {
  if (!hash) return false;
  const [algorithm, iterationsValue, saltValue, expectedValue] = hash.split("$");
  if (algorithm !== "pbkdf2-sha256") return (await hashValue(pin)) === hash;

  const iterations = Number(iterationsValue);
  const salt = saltValue ? hexToBytes(saltValue) : null;
  const expected = expectedValue ? hexToBytes(expectedValue) : null;
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || !salt || !expected) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const actual = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256),
  );
  if (actual.length !== expected.length) return false;
  return (
    actual.reduce((difference, byte, index) => difference | (byte ^ expected[index]!), 0) === 0
  );
}

function normalizeOperatorCode(operatorCode: string) {
  return operatorCode.trim().toUpperCase();
}

async function createTechnicalEmail(companyId: string, operatorCode: string) {
  const identifier = await hashValue(`${companyId}:${normalizeOperatorCode(operatorCode)}`);
  return `${identifier}@internal.monta-ai.invalid`;
}

async function removeLegacyOperatorSecret(profileId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("operator_secrets")
      .delete()
      .eq("profile_id", profileId);
    if (error) console.error("Não foi possível remover a credencial operacional legada.");
  } catch {
    console.error("Não foi possível remover a credencial operacional legada.");
  }
}

async function requireAdminScope(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profile, error: profileError }, { data: role, error: roleError }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("company_id").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

  if (profileError || roleError || !profile?.company_id || role?.role !== "admin") {
    throw new Error("Apenas administradores podem gerenciar usuários.");
  }

  return { companyId: profile.company_id, supabaseAdmin };
}

async function assertCompanyUser(adminUserId: string, targetUserId: string) {
  const scope = await requireAdminScope(adminUserId);
  const { data: profile, error } = await scope.supabaseAdmin
    .from("profiles")
    .select("id, company_id, full_name, operator_code, pin_hash, must_change_password")
    .eq("id", targetUserId)
    .eq("company_id", scope.companyId)
    .maybeSingle();

  if (error || !profile) throw new Error("Usuário não encontrado.");
  return { ...scope, profile };
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

    if (profileError || !profile) return { success: false, error: AUTH_FAILURE };
    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      return { success: false, error: AUTH_FAILURE };
    }

    if (!(await verifyPin(pin, profile.pin_hash))) {
      const attempts = (profile.failed_attempts || 0) + 1;
      const lockedUntil =
        attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await supabaseAdmin
        .from("profiles")
        .update({ failed_attempts: attempts, locked_until: lockedUntil })
        .eq("id", profile.id);
      await supabaseAdmin.from("operator_login_logs").insert({
        profile_id: profile.id,
        operator_code: operatorCode,
        company_id: profile.company_id,
        status: lockedUntil ? "locked" : "failed",
      });
      return { success: false, error: AUTH_FAILURE };
    }

    const { data: secret, error: secretError } = await supabaseAdmin
      .from("operator_secrets")
      .select("secret_password")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (secretError) return { success: false, error: AUTH_FAILURE };

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userError || !user?.email) return { success: false, error: AUTH_FAILURE };

    await supabaseAdmin
      .from("profiles")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", profile.id);
    await supabaseAdmin.from("operator_login_logs").insert({
      profile_id: profile.id,
      operator_code: operatorCode,
      company_id: profile.company_id,
      status: "success",
    });

    return { success: true, email: user.email, password: secret?.secret_password ?? null };
  });

export const listCompanyUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { companyId, supabaseAdmin } = await requireAdminScope(context.userId);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, operator_code, must_change_password")
      .eq("company_id", companyId)
      .order("full_name");
    if (profilesError) throw new Error("Não foi possível carregar os usuários.");
    if (!profiles.length) return [];

    const userIds = profiles.map(({ id }) => id);
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);
    if (rolesError) throw new Error("Não foi possível carregar os usuários.");

    const authUsers = await Promise.all(
      userIds.map(async (id) => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
        if (error || !data.user) throw new Error("Não foi possível carregar os usuários.");
        return data.user;
      }),
    );
    const roleByUser = new Map(
      roles.map(({ user_id, role }) => [user_id, role as CompanyUserRole]),
    );
    const authByUser = new Map(authUsers.map((user) => [user.id, user]));
    const now = Date.now();

    return profiles.map((profile) => {
      const bannedUntil = authByUser.get(profile.id)?.banned_until;
      return {
        id: profile.id,
        fullName: profile.full_name ?? "",
        operatorCode: profile.operator_code ?? "",
        mustChangePassword: profile.must_change_password ?? false,
        role: roleByUser.get(profile.id) ?? null,
        blocked: Boolean(bannedUntil && new Date(bannedUntil).getTime() > now),
      };
    });
  });

export const createCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => createCompanyUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { companyId, supabaseAdmin } = await requireAdminScope(context.userId);
    const operatorCode = normalizeOperatorCode(data.operatorCode);
    const email = await createTechnicalEmail(companyId, operatorCode);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.pin,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (authError || !authData.user)
      throw new Error("Não foi possível criar o usuário. Verifique se o código já existe.");

    const userId = authData.user.id;
    try {
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        company_id: companyId,
        full_name: data.fullName,
        operator_code: operatorCode,
        pin_hash: await hashPin(data.pin),
        must_change_password: false,
      });
      if (profileError) throw profileError;

      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: data.role as StoredRole,
      });
      if (roleError) throw roleError;
    } catch {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await Promise.allSettled([
        supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
        supabaseAdmin.from("profiles").delete().eq("id", userId),
      ]);
      throw new Error("Não foi possível criar o usuário. Verifique se o código já existe.");
    }

    return { success: true, userId };
  });

export const updateCompanyUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateCompanyUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, profile } = await assertCompanyUser(context.userId, data.userId);
    if (data.blocked && data.userId === context.userId)
      throw new Error("Você não pode bloquear seu próprio acesso.");

    const [{ data: originalRole, error: roleReadError }, { data: authData, error: authReadError }] =
      await Promise.all([
        supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(data.userId),
      ]);
    if (roleReadError || !originalRole || authReadError || !authData.user) {
      throw new Error("Não foi possível consultar o usuário.");
    }
    if (
      data.userId === context.userId &&
      originalRole.role === "admin" &&
      data.role !== undefined &&
      data.role !== "admin"
    ) {
      throw new Error("Você não pode remover sua própria função de administrador.");
    }

    const originalBan = authData.user.banned_until;

    let profileChanged = false;
    let roleChanged = false;
    let banChanged = false;

    try {
      const profileUpdate = {
        ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
        ...(data.operatorCode !== undefined
          ? { operator_code: normalizeOperatorCode(data.operatorCode) }
          : {}),
        ...(data.pin !== undefined
          ? { pin_hash: await hashPin(data.pin), must_change_password: false }
          : {}),
      };
      if (Object.keys(profileUpdate).length) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", data.userId);
        if (error) throw error;
        profileChanged = true;
      }

      if (data.role !== undefined && data.role !== originalRole.role) {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .update({ role: data.role as StoredRole })
          .eq("user_id", data.userId);
        if (error) throw error;
        roleChanged = true;
      }

      if (data.blocked !== undefined) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
          ban_duration: data.blocked ? "876000h" : "none",
        });
        if (error) throw error;
        banChanged = true;
      }

      if (data.pin) {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          data.userId,
          {
            password: data.pin,
          },
        );
        if (passwordError) throw passwordError;
      }
    } catch {
      const rollbacks: PromiseLike<unknown>[] = [];
      if (profileChanged) {
        rollbacks.push(
          supabaseAdmin
            .from("profiles")
            .update({
              full_name: profile.full_name,
              operator_code: profile.operator_code,
              pin_hash: profile.pin_hash,
              must_change_password: profile.must_change_password,
            })
            .eq("id", data.userId),
        );
      }
      if (roleChanged) {
        rollbacks.push(
          supabaseAdmin
            .from("user_roles")
            .update({ role: originalRole.role })
            .eq("user_id", data.userId),
        );
      }
      if (banChanged) {
        const remainingSeconds = originalBan
          ? Math.max(1, Math.ceil((new Date(originalBan).getTime() - Date.now()) / 1000))
          : 0;
        rollbacks.push(
          supabaseAdmin.auth.admin.updateUserById(data.userId, {
            ban_duration: remainingSeconds > 0 ? `${remainingSeconds}s` : "none",
          }),
        );
      }
      await Promise.allSettled(rollbacks);
      throw new Error(
        "Não foi possível atualizar o usuário. Verifique os dados e tente novamente.",
      );
    }

    if (data.pin) {
      await removeLegacyOperatorSecret(data.userId);
    }

    return { success: true };
  });

export const setOperatorCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ profileId: z.string().uuid(), operatorCode: operatorCodeSchema, pin: pinSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, profile } = await assertCompanyUser(context.userId, data.profileId);
    let profileChanged = false;
    try {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          operator_code: normalizeOperatorCode(data.operatorCode),
          pin_hash: await hashPin(data.pin),
          must_change_password: false,
        })
        .eq("id", data.profileId);
      if (profileError) throw profileError;
      profileChanged = true;

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        data.profileId,
        {
          password: data.pin,
        },
      );
      if (passwordError) throw passwordError;
    } catch {
      const rollbacks: PromiseLike<unknown>[] = [];
      if (profileChanged) {
        rollbacks.push(
          supabaseAdmin
            .from("profiles")
            .update({
              operator_code: profile.operator_code,
              pin_hash: profile.pin_hash,
              must_change_password: profile.must_change_password,
            })
            .eq("id", data.profileId),
        );
      }
      await Promise.allSettled(rollbacks);
      throw new Error("Não foi possível configurar as credenciais do usuário.");
    }

    await removeLegacyOperatorSecret(data.profileId);

    return { success: true };
  });

export const createOperator = createCompanyUser;
