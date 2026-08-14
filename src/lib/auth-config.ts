export const AUTH_CONFIG = {
  PILOT_MODE: true,
  MIN_PASSWORD_LENGTH: 4,
  RECOMMENDED_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 20
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
