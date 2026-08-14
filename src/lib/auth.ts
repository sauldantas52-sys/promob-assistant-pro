export const useAuth = () => {
  return {
    user: null,
    isAuthenticated: false,
    signIn: async () => {},
    signOut: async () => {},
  };
};
