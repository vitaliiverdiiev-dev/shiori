import product from '../../../product.config.json';
import { HealthStatus } from './health-status.tsx';

const faviconHref = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="serif">${product.logoGlyph}</text></svg>`,
)}`;

export function App() {
  return (
    <>
      <title>{`${product.name} — ${product.tagline}`}</title>
      <link rel="icon" href={faviconHref} />
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:justify-center">
        <header className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex size-28 items-center justify-center rounded-3xl bg-primary font-display text-7xl text-primary-foreground shadow-sm sm:size-32 sm:text-8xl"
          >
            {product.logoGlyph}
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p
            lang="ja"
            className="mt-1 font-display text-xl text-muted-foreground"
          >
            {product.nameJa}
          </p>
          <p className="mt-4 text-lg font-medium text-primary">
            {product.tagline}
          </p>
        </header>

        <p className="mt-8 text-center text-base leading-relaxed text-muted-foreground">
          Learn hiragana, katakana, kanji and vocabulary together — every word
          linked to its readings, meanings and the kanji inside it.
        </p>

        <div className="mt-auto pt-10 sm:mt-10">
          <HealthStatus />
        </div>
      </main>
    </>
  );
}
