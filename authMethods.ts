const ALL_METHODS = ['phone', 'email', 'google'] as const;

export type AuthMethod = (typeof ALL_METHODS)[number];

const enabled = (
  import.meta.env.VITE_AUTH_ENABLED_METHODS || ALL_METHODS.join(',')
)
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean) as AuthMethod[];

export const isAuthMethodEnabled = (method: AuthMethod): boolean =>
  enabled.includes(method);

export const getEnabledAuthMethods = (): AuthMethod[] => [...enabled];

export const getDefaultAuthMethod = (): AuthMethod =>
  enabled.includes('google') ? 'google' : enabled[0];

export const showAuthMethodPicker = (): boolean => enabled.length > 1;
