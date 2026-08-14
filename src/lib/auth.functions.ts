import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email(), password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Implementação de autenticação Lovable Cloud aqui
    return { success: true };
  });

export const signOut = createServerFn({ method: "POST" })
  .handler(async () => {
    return { success: true };
  });
