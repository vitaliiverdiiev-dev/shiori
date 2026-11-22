import { Outlet } from 'react-router';
import { RouteBoundary } from '../routing/route-boundary';

export const FocusLayout = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:pt-8">
    <RouteBoundary>
      <Outlet />
    </RouteBoundary>
  </main>
);
