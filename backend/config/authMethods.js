const ALL_METHODS = ['phone', 'email', 'google'];

const enabled = (process.env.AUTH_ENABLED_METHODS || ALL_METHODS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const isAuthMethodEnabled = (method) => enabled.includes(method);

export const getEnabledAuthMethods = () => [...enabled];
