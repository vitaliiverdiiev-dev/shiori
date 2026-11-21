import { Logo } from '@/shared/ui';

type Props = {
  logoGlyph: string;
  name: string;
  nameJa: string;
  tagline: string;
};

export const HomePage = ({ logoGlyph, name, nameJa, tagline }: Props) => (
  <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:justify-center">
    <header className="flex flex-col items-center text-center">
      <Logo
        className="shadow-sm"
        decorative
        glyph={logoGlyph}
        name={name}
        size="xl"
        variant="symbol"
      />
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 font-display text-xl text-muted-foreground" lang="ja">
        {nameJa}
      </p>
      <p className="mt-4 text-lg font-medium text-primary">{tagline}</p>
    </header>

    <p className="mt-8 text-center text-base leading-relaxed text-muted-foreground">
      Learn hiragana, katakana, kanji and vocabulary together - every word
      linked to its readings, meanings and the kanji inside it.
    </p>
  </main>
);
