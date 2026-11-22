import { AccountForm } from '@/domain/auth';

export const AccountSettingsPage = () => (
  <div className="flex w-full max-w-lg flex-col gap-8">
    <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
    <AccountForm />
  </div>
);
