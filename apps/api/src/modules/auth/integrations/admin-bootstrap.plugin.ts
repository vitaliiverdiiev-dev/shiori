import type { BetterAuthPlugin } from 'better-auth';

export const adminBootstrapPlugin = {
  id: 'admin-bootstrap',
  schema: {
    adminBootstrap: {
      fields: { completedAt: { required: true, type: 'date' } },
    },
  },
} satisfies BetterAuthPlugin;
