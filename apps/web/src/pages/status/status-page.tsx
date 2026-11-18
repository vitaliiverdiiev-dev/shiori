import { HealthStatus } from '@/domain/health';

export const StatusPage = () => (
  <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-8">
    <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
    <HealthStatus />
  </main>
);
