type Props = {
  glyph: string;
};

export const NavigationGlyph = ({ glyph }: Props) => (
  <span
    aria-hidden="true"
    className="flex size-4 shrink-0 items-center justify-center text-sm leading-none font-normal"
    lang="ja"
  >
    {glyph}
  </span>
);
