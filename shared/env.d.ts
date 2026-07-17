// Shared ambient type declarations for cross-platform code.
// These files run in both browser and Node.js; runtime guards
// (typeof process !== 'undefined') gate access, but TS needs
// the symbols to exist in the type system under DOM lib.

declare namespace NodeJS {
  interface ProcessVersions {
    node?: string;
    [key: string]: string | undefined;
  }
}

declare const process: {
  env: Record<string, string | undefined>;
  versions?: NodeJS.ProcessVersions;
};

declare function require(id: string): any;
