import { useSessionUserId } from '@/domain/auth';
import { type KanaScript, KanaSelection } from '@/domain/kana';

type Props = {
  script: KanaScript;
};

export const KanaPage = ({ script }: Props) => {
  const userId = useSessionUserId();

  return <KanaSelection key={script} script={script} userId={userId} />;
};
