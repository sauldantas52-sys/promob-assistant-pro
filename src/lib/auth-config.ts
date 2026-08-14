export const AUTH_CONFIG = {
  PILOT_MODE: false,
  MIN_PASSWORD_LENGTH: 8, // Mantendo 8 para segurança do Supabase, mas com orientação numérica
  RECOMMENDED_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 20
};

export const isNumeric = (str: string) => {
  return /^\d+$/.test(str);
};

export const isPasswordStrong = (password: string) => {
  return password.length >= AUTH_CONFIG.RECOMMENDED_PASSWORD_LENGTH;
};

export const isValidPasswordLength = (password: string) => {
  return (
    password.length >= AUTH_CONFIG.MIN_PASSWORD_LENGTH &&
    password.length <= AUTH_CONFIG.MAX_PASSWORD_LENGTH
  );
};
