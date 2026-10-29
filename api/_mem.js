// In-memory stand-in for the handful of Redis commands this site uses.
// Local development only — _lib.js refuses to fall back to it on Vercel.

const store = new Map();

const hash = (k) => {
  if (!store.has(k)) store.set(k, new Map());
  return store.get(k);
};

function run([name, key, ...a]) {
  switch (String(name).toUpperCase()) {
    case "GET": return store.has(key) ? store.get(key) : null;
    case "SET": store.set(key, String(a[0])); return "OK";
    case "DEL": return store.delete(key) ? 1 : 0;
    case "INCR": {
      const v = Number(store.get(key) || 0) + 1;
      store.set(key, String(v));
      return v;
    }
    case "EXPIRE": return 1;
    case "HSET": {
      const h = hash(key);
      for (let i = 0; i < a.length; i += 2) h.set(String(a[i]), String(a[i + 1]));
      return a.length / 2;
    }
    case "HSETNX": {
      const h = hash(key);
      if (h.has(a[0])) return 0;
      h.set(String(a[0]), String(a[1]));
      return 1;
    }
    case "HINCRBY": {
      const h = hash(key);
      const v = Number(h.get(a[0]) || 0) + Number(a[1]);
      h.set(String(a[0]), String(v));
      return v;
    }
    case "HGET": return store.has(key) ? store.get(key).get(a[0]) ?? null : null;
    case "HDEL": {
      if (!store.has(key)) return 0;
      let n = 0;
      for (const f of a) if (store.get(key).delete(f)) n++;
      return n;
    }
    case "HMGET": return a.map((f) => (store.has(key) ? store.get(key).get(String(f)) ?? null : null));
    case "HGETALL": return store.has(key) ? [...store.get(key)].flat() : [];
    case "ZADD": hash(key).set(String(a[1]), Number(a[0])); return 1;
    case "ZREM": return store.has(key) && store.get(key).delete(a[0]) ? 1 : 0;
    case "ZCARD": return store.has(key) ? store.get(key).size : 0;
    case "ZRANGE": {
      // ZRANGE key start stop [REV] [WITHSCORES]
      const flags = a.slice(2).map((f) => String(f).toUpperCase());
      let rows = store.has(key) ? [...store.get(key)] : [];
      rows.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
      if (flags.includes("REV")) rows.reverse();
      const stop = Number(a[1]) < 0 ? rows.length + Number(a[1]) : Number(a[1]);
      rows = rows.slice(Number(a[0]), stop + 1);
      return flags.includes("WITHSCORES")
        ? rows.flatMap(([m, s]) => [m, String(s)])
        : rows.map(([m]) => m);
    }
    default: throw new Error(`_mem.js: unsupported command ${name}`);
  }
}

export function memPipeline(commands) {
  return commands.map(run);
}
