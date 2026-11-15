const UNIQUE_VIOLATION = '23505';

function causes(error: unknown): object[] {
  const chain: object[] = [];
  for (let current = error; current instanceof Object;) {
    chain.push(current);
    current = 'cause' in current ? current.cause : undefined;
  }
  return chain;
}

export function errorCode(error: unknown): string | undefined {
  return causes(error).find(
    (cause): cause is { code: string } =>
      'code' in cause && typeof cause.code === 'string',
  )?.code;
}

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return causes(error).some(
    (cause) =>
      'code' in cause &&
      cause.code === UNIQUE_VIOLATION &&
      'constraint' in cause &&
      cause.constraint === constraint,
  );
}
