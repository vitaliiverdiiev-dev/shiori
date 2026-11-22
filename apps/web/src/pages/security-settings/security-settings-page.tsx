import { ChangePasswordForm, RevokeOtherSessions } from '@/domain/auth';

export const SecuritySettingsPage = () => (
  <div className="flex w-full max-w-lg flex-col gap-10">
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
  </div>
);
