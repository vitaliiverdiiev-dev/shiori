import { useQuery } from '@tanstack/react-query';
import { healthQuery, readinessQuery } from '../api/queries';
import { getStatus, isApiHealthy } from '../helpers/helpers';
import type { Status } from '../model/types';

export function useHealthStatus(): { retry: () => void; status: Status } {
  const health = useQuery(healthQuery);
  const apiHealthy = health.isSuccess && isApiHealthy(health.data);
  const readiness = useQuery({ ...readinessQuery, enabled: apiHealthy });

  const retry = () => {
    void health.refetch();
    if (apiHealthy) void readiness.refetch();
  };

  return { retry, status: getStatus(health, readiness) };
}
