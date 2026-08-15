export const AUTH_CONFIG = {
  PILOT_MODE: false,
  MIN_PASSWORD_LENGTH: 8,
  RECOMMENDED_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 20,
  MIN_OPERATOR_PIN_LENGTH: 4, // Alterado de 6 para 4 conforme solicitado
  MAX_OPERATOR_PIN_LENGTH: 20
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
