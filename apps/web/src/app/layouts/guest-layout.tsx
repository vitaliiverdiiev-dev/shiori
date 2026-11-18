import { Outlet } from 'react-router';

type Props = {
  logoGlyph: string;
  name: string;
};

export const GuestLayout = ({ logoGlyph, name }: Props) => (
  <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:justify-center sm:pt-12">
    <header className="mb-10 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-xl bg-primary font-display text-2xl text-primary-foreground"
      >
        {logoGlyph}
      </span>
      <span className="text-lg font-semibold tracking-tight">{name}</span>
    </header>
    <Outlet />
  </div>
);
