import { HealthStatus } from '@/domain/health';

type Props = {
  logoGlyph: string;
  name: string;
  nameJa: string;
  tagline: string;
};

export const HomePage = ({ logoGlyph, name, nameJa, tagline }: Props) => (
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:justify-center">
    <header className="flex flex-col items-center text-center">
      <div
        aria-hidden="true"
        className="flex size-28 items-center justify-center rounded-3xl bg-primary font-display text-7xl text-primary-foreground shadow-sm sm:size-32 sm:text-8xl"
      >
        {logoGlyph}
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 font-display text-xl text-muted-foreground" lang="ja">
        {nameJa}
      </p>
      <p className="mt-4 text-lg font-medium text-primary">{tagline}</p>
    </header>

    <p className="mt-8 text-center text-base leading-relaxed text-muted-foreground">
      Learn hiragana, katakana, kanji and vocabulary together — every word
      linked to its readings, meanings and the kanji inside it.
    </p>

    <div className="mt-auto pt-10 sm:mt-10">
      <HealthStatus />
    </div>
  </main>
);
