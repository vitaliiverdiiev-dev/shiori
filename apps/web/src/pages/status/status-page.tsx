import { HealthStatus } from '@/domain/health';

export const StatusPage = () => (
  <div className="flex w-full max-w-2xl flex-col gap-6">
    <HealthStatus />
  </div>
);
