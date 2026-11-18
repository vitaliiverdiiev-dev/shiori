import { AccountForm } from '@/domain/auth';

export const AccountSettingsPage = () => (
  <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
    <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
    <AccountForm />
  </main>
);
