import { useEffect, useState } from 'react';
import { checkStatus } from '../api/requests';
import { CHECKING } from '../model/consts';
import type { Status } from '../model/types';

/** Current API/database status; `retry` starts a fresh check. */
export function useHealthStatus(): { retry: () => void; status: Status } {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>(CHECKING);

  useEffect(() => {
    let active = true;
    void checkStatus().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setStatus(CHECKING);
    setAttempt((n) => n + 1);
  };

  return { retry, status };
}
