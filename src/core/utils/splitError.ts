export function splitError(args: unknown[]): {
  args: unknown[];
  error?: Error;
} {
  let error: Error | undefined;

  const rest = args.filter((arg) => {
    if (!error && arg instanceof Error) {
      error = arg;
      return false;
    }
    return true;
  });

  return { args: rest, error };
}
