import { z } from 'zod';
import { INVITATION_CODE_LENGTH } from '../constants/invitation.constants.js';

export const invitationCodeSchema = z
  .string()
  .length(INVITATION_CODE_LENGTH)
  .regex(/^[\w-]+$/);
