/** Minimal Web Storage stub for Vitest's Node environment. */
function createMemoryStorage() {
  /** @type {Map<string, string>} */
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    /** @param {string} key */
    getItem(key) {
      return store.has(String(key)) ? /** @type {string} */ (store.get(String(key))) : null;
    },
    /** @param {number} index */
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    /** @param {string} key */
    removeItem(key) {
      store.delete(String(key));
    },
    /** @param {string} key @param {string} value */
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = createMemoryStorage();
}
if (typeof globalThis.sessionStorage === "undefined") {
  globalThis.sessionStorage = createMemoryStorage();
}
