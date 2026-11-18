import { z } from 'zod';
import {
  commonMessages,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './consts';

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address.'));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, commonMessages.passwordLength)
  .max(PASSWORD_MAX_LENGTH, commonMessages.passwordLength);

const name = z.string().trim().min(1, 'Enter your name.');

const PASSWORDS_DIFFER = 'Passwords do not match.';

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z
  .object({
    confirmPassword: z.string(),
    email,
    invitationCode: z.string().trim().min(1, 'Enter your invitation code.'),
    name,
    password: newPassword,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: PASSWORDS_DIFFER,
    path: ['confirmPassword'],
  });

export const accountNameSchema = z.object({ name });

export const changePasswordSchema = z
  .object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: PASSWORDS_DIFFER,
    path: ['confirmPassword'],
  });

export type AccountNameValues = z.output<typeof accountNameSchema>;
export type ChangePasswordValues = z.output<typeof changePasswordSchema>;
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;
