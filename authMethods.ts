export type AuthMethod = 'phone' | 'email' | 'google';

const ALL_METHODS: AuthMethod[] = ['phone', 'email', 'google'];

// Parse enabled methods from env variable
const getEnabledMethods = (): AuthMethod[] => {
  const envMethods = import.meta.env.VITE_AUTH_ENABLED_METHODS || 'phone,email,google';
  return envMethods
    .split(',')
    .map((m: string) => m.trim() as AuthMethod)
    .filter((m: AuthMethod) => ALL_METHODS.includes(m));
};

const enabledMethods = getEnabledMethods();

export const isAuthMethodEnabled = (method: AuthMethod): boolean => {
  return enabledMethods.includes(method);
};

export const getEnabledAuthMethods = (): AuthMethod[] => {
  return enabledMethods;
};

export const getDefaultAuthMethod = (): AuthMethod => {
  return enabledMethods.includes('google') ? 'google' : enabledMethods[0] || 'phone';
};
