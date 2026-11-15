import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

export interface TerminalIo {
  ask(question: string): Promise<string>;
  askSecret(question: string): Promise<string>;
  close(): void;
  error(message: string): void;
  print(message: string): void;
}

export class TerminalInputClosedError extends Error {
  constructor() {
    super('Input ended before every answer was given.');
  }
}

export function createTerminalIo(): TerminalIo {
  let muted = false;
  const echo = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const readline = createInterface({
    input: process.stdin,
    output: echo,
    terminal: process.stdin.isTTY,
  });
  readline.on('SIGINT', () => {
    readline.close();
  });
  const lines = readline[Symbol.asyncIterator]();

  async function readAnswer(question: string, secret: boolean) {
    readline.setPrompt(question);
    readline.prompt();
    muted = secret;
    try {
      const { done, value } = await lines.next();
      if (done) throw new TerminalInputClosedError();
      return value;
    } finally {
      muted = false;
      if (secret) process.stdout.write('\n');
    }
  }

  return {
    ask: (question) => readAnswer(question, false),
    askSecret: (question) => readAnswer(question, true),
    close: () => {
      readline.close();
    },
    error: (message) => process.stderr.write(`${message}\n`),
    print: (message) => process.stdout.write(`${message}\n`),
  };
}
