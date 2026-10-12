// Scope: a single Worker isolate. In-flight reads are shared only until settled.
// Successful responses retain their existing domain TTL cache; failures are never cached.
export function createSingleFlight() {
  let active = null;
  return async (loader) => {
    if (active) return active;
    const pending = Promise.resolve().then(loader);
    active = pending;
    try {
      return await pending;
    } finally {
      if (active === pending) active = null;
    }
  };
}
