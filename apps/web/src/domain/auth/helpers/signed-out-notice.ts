import { SIGNED_OUT_STATE } from '../model/consts';

export function hasSignedOutNotice(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'signedOut' in state &&
    state.signedOut === SIGNED_OUT_STATE.signedOut
  );
}
