export const authPaths = {
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
} as const;

export const REDIRECT_PARAM = 'redirect';

export const UNAUTHORIZED_STATUS = 401;
export const TOO_MANY_REQUESTS_STATUS = 429;
export const SERVER_ERROR_STATUS = 500;

export const REDIRECT_PARSE_ORIGIN = 'http://redirect.invalid';

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export const commonMessages = {
  network: 'Shiori could not be reached. Check your connection and try again.',
  passwordLength: `Use ${String(PASSWORD_MIN_LENGTH)}–${String(PASSWORD_MAX_LENGTH)} characters. Spaces, emoji and any language are fine.`,
  serverError: 'Something went wrong on the server. Try again in a moment.',
  sessionEnded: 'Your session has ended. Sign in again.',
  tooManyRequests: 'Too many attempts. Wait a moment and try again.',
} as const;

export const signInMessages = {
  codes: {
    INVALID_EMAIL: 'Email or password is incorrect.',
    INVALID_EMAIL_OR_PASSWORD: 'Email or password is incorrect.',
  },
  fallback: 'Could not sign in. Try again.',
};

export const signUpMessages = {
  codes: {
    EMAIL_PASSWORD_SIGN_UP_DISABLED: 'Registration is closed.',
    INVALID_INVITATION:
      'This invitation code is not valid for this email address, or it has expired or already been used.',
    PASSWORD_TOO_LONG: commonMessages.passwordLength,
    PASSWORD_TOO_SHORT: commonMessages.passwordLength,
  },
  fallback: 'Could not create the account. Check your details and try again.',
};

export const DUPLICATE_ACCOUNT_CODES: readonly string[] = [
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
];

export const accountMessages = {
  codes: {},
  fallback: 'Could not update your name. Try again.',
  unauthorized: commonMessages.sessionEnded,
};

export const changePasswordMessages = {
  codes: {
    INVALID_PASSWORD: 'Current password is incorrect.',
    PASSWORD_TOO_LONG: commonMessages.passwordLength,
    PASSWORD_TOO_SHORT: commonMessages.passwordLength,
  },
  fallback: 'Could not change your password. Try again.',
  unauthorized: commonMessages.sessionEnded,
};

export const revokeSessionsMessages = {
  codes: {},
  fallback: 'Could not sign out other devices. Try again.',
  unauthorized: commonMessages.sessionEnded,
};
