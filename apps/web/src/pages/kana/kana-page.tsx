import { useSessionUserId } from '@/domain/auth';
import { type KanaScript, kanaScripts, KanaSelection } from '@/domain/kana';

type Props = {
  script: KanaScript;
};

export const KanaPage = ({ script }: Props) => {
  const { label, nativeLabel } = kanaScripts[script];
  const userId = useSessionUserId();

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
          <p className="text-lg text-muted-foreground" lang="ja">
            {nativeLabel}
          </p>
        </div>
        <p className="text-muted-foreground">
          Choose the characters you want to memorize: one at a time, a whole row
          or a whole section.
        </p>
      </header>
      <KanaSelection key={script} script={script} userId={userId} />
    </div>
  );
};
