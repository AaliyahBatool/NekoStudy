
const userLocks = new Map<string, Promise<void>>();

export async function withUserLock<T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = userLocks.get(userId) ?? Promise.resolve();

  let release!: () => void;

  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  userLocks.set(userId, current);

  await previous;

  try {
    return await operation();
  } finally {
    release();

    if (userLocks.get(userId) === current) {
      userLocks.delete(userId);
    }
  }
}
