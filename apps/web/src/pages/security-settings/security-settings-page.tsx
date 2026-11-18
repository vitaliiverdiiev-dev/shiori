import { ChangePasswordForm, RevokeOtherSessions } from '@/domain/auth';

export const SecuritySettingsPage = () => (
  <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
    <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
    <section aria-labelledby="change-password" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold" id="change-password">
          Change password
        </h2>
        <p className="text-sm text-muted-foreground">
          Changing your password signs you out on every other device.
        </p>
      </div>
      <ChangePasswordForm />
    </section>
    <section
      aria-labelledby="other-devices"
      className="flex flex-col gap-5 border-t pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold" id="other-devices">
          Other devices
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign out everywhere except this device, for example after using a
          shared computer.
        </p>
      </div>
      <RevokeOtherSessions />
    </section>
  </main>
);
