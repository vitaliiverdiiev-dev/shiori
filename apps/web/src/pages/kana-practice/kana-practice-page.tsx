import { useSessionUserId } from '@/domain/auth';
import { KanaPractice, type KanaScript } from '@/domain/kana';

type Props = {
  script: KanaScript;
};

export const KanaPracticePage = ({ script }: Props) => {
  const userId = useSessionUserId();

  return <KanaPractice key={script} script={script} userId={userId} />;
};
