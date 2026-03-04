# native-scrypt

A **zero-dependency**, TypeScript-first password hashing and verification library built entirely on Node.js's built-in `crypto` module. Uses `scrypt` for hashing and `timingSafeEqual` for comparison — no native bindings, no build tools, no surprises.

---

## Motivation — Why Not bcrypt?

Most packages point developers toward `bcrypt` or `bcryptjs`. Both have real, practical problems.

### `bcrypt` (the native binding)

`bcrypt` wraps a C++ implementation via `node-gyp`. This means:

- **Install failures are common.** `node-gyp` requires Python, `make`, and a C++ compiler. On a fresh CI machine or Docker image, it frequently just fails.
- **Breaks on Node.js upgrades.** Native addons must be recompiled for each Node.js major version. After upgrading Node, you must `npm rebuild bcrypt` or face cryptic errors.
- **Not portable.** Doesn't work in edge/serverless runtimes (Cloudflare Workers, Vercel Edge Functions, Deno) that don't expose native binding APIs.

### `bcryptjs`

`bcryptjs` is a pure-JavaScript rewrite that solves the install problem but introduces a different one:

- **It's slow by design.** Without native bindings, the bcrypt key derivation is done in JS — making it significantly slower than the native version.
- **The bcrypt algorithm itself is aging.** It's based on the Blowfish cipher designed in 1999. Its memory requirements are fixed (very low by modern standards), meaning it's **not memory-hard** — modern GPUs and ASICs can brute-force it in parallel relatively efficiently.
- **Blocks the event loop.** Because `bcryptjs` is pure JavaScript, the key derivation runs entirely on the main thread. For the duration of the hash, Node's event loop is frozen — no incoming requests are handled, no I/O events. At the default cost factor (10), `bcryptjs` takes **~250–400ms** per hash on a typical server. At the production-recommended cost factor (12), that climbs to **~1–2 seconds** — meaning every login or registration request stalls the entire process for up to two seconds.

### Why `scrypt`?

`scrypt` was specifically designed to be **memory-hard**: cracking it requires not just CPU time but large amounts of RAM, making large-scale parallel attacks via GPUs or custom ASICs prohibitively expensive. It is:

- Built into Node.js `crypto` — available since Node 10.5, no install step
- Immune to the `node-gyp` problem — it's a JS call into libuv, not a native addon

---

## Installation

```bash
npm install native-scrypt
```

Requires **Node.js >= 16**.

---

## API Reference

### `Password.toHash(password: string): Promise<string>`

Hashes a plain-text password using `scrypt` with a randomly generated 16-byte salt.

Returns a single string in the format `<hex_hash>.<hex_salt>` — safe to store directly in a database column.

```ts
import { Password } from 'native-scrypt';

const hash = await Password.toHash('my_secret_password');
// e.g. "a3fb...c2d1.e4da...f18b"
```

| Parameter  | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| `password` | `string` | The plain-text password to hash |

**Returns:** `Promise<string>` — the stored hash string (`hash.salt`)

---

### `Password.compare(storedPassword: string, suppliedPassword: string): Promise<boolean>`

Verifies a plain-text password against a previously stored hash string.

Returns `true` if the passwords match, `false` otherwise. Internally uses `timingSafeEqual` so the comparison always takes the same amount of time regardless of where (or whether) a mismatch occurs — preventing `timing side-channel attacks`

```ts
const isValid = await Password.compare(storedHash, 'my_secret_password');
// returns true

const isInvalid = await Password.compare(storedHash, 'wrong_password');
// returns false
```

| Parameter         | Type     | Description                                   |
| ----------------- | -------- | --------------------------------------------- |
| `storedPassword`  | `string` | The hash string returned by `toHash()`        |
| `suppliedPassword`| `string` | The plain-text password to verify             |

**Returns:** `Promise<boolean>`

---

## Usage Example

```ts
import { Password } from 'native-scrypt';

// Registration
const passwordHash = await Password.toHash(req.body.password);
await db.users.create({ email: req.body.email, passwordHash });

// Login
const user = await db.users.findOne({ email: req.body.email });
const isValid = await Password.compare(user.passwordHash, req.body.password);

if (!isValid) {
  throw new Error('Invalid credentials');
}
```

---

## Security Notes

- **Random salt per password.** `crypto.randomBytes(16)` generates a fresh salt for every hash — two identical passwords will always produce different hashes.
- **Timing-safe comparison.** Standard `===` comparison short-circuits on the first mismatched character, leaking information about partial hash matches. `timingSafeEqual` always iterates the full hash, eliminating this timing difference.
- **No dependencies.** The entire library is a thin wrapper over Node.js built-ins. There is nothing to audit, and dependency problem.

---

## Further Improvements

These are planned or considered for future versions:

- [ ] **Hash upgrade path** — detect when a stored hash was generated with weaker parameters and transparently re-hash on the next successful login, without forcing users to change their password.
- [ ] **Proper test suite** — replace the manual `test.ts` smoke test with a Jest or Vitest with proper assertions and edge-case coverage (empty passwords, very long passwords, malformed stored hashes, etc.).

---

## License

MIT © [vallabh](https://github.com/Vallabh-1504)
