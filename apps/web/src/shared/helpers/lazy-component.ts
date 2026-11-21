import { type ComponentType, lazy } from 'react';

export class ModuleLoadError extends Error {
  constructor(cause: unknown) {
    super('A lazily loaded module could not be loaded', { cause });
    this.name = 'ModuleLoadError';
  }
}

export function lazyComponent<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
) {
  return lazy(async () => {
    try {
      return { default: await load() };
    } catch (error) {
      throw new ModuleLoadError(error);
    }
  });
}
