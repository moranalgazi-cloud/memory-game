# Learning roadmap (reference checklist)

Use this list when you want to level up this project toward “real app” habits: Git, CI, Supabase, stores, and how you work.

---

## Repo & Git

- [ ] Install Git; verify `git` works in your terminal
- [ ] Add a solid **`.gitignore`** (at least `node_modules`, build output, env files)
- [ ] Create a GitHub repo and **push** the current project
- [ ] Practice small **commits** with clear messages
- [ ] Tag a milestone (**`v0.1.0`**) when something stable works, and push tags

---

## CI

- [ ] Add **GitHub Actions**: `npm ci` + **`npm run test:run`** on push/PR
- [ ] Fix anything CI surfaces until a green check is the default

---

## Supabase & backend literacy

- [ ] **Auth**: sign up, sign in, sign out, password reset (what you actually use)
- [ ] **RLS**: policies so users only access their own rows on main tables
- [ ] **Env**: dev vs prod keys; never commit secrets
- [ ] **One server path**: a small **Edge Function** or **RPC** for one real operation (not only client → DB)

---

## App quality (go deep on a few, not all at once)

- [ ] Loading + error handling on every Supabase call
- [ ] **README**: how to install, run, and test
- [ ] Optional: short note on **why RLS is shaped** the way it is (for future you)

---

## Store shipping (when you are ready)

- [ ] Pick **Android first** *or* **iOS first** (one track to learn well)
- [ ] **Android**: signing, `versionCode` / `versionName`, Play Console **internal testing**
- [ ] **iOS**: Apple Developer account, certificates/profiles, **TestFlight**
- [ ] Tie a **git tag** to “what we shipped” for that build

---

## Habits that scale

- [ ] Build in **vertical slices** (e.g. login → one feature → done), not many half-finished features
- [ ] When stuck, read **official docs** (Supabase + store consoles) before random tutorials

---

## Notes

- **Web-only vs mobile**: If you stay web-first, delay “Store shipping” until you wrap the app (e.g. Capacitor) or start a native/RN project. If mobile is the goal, pick one store first and ship a test build early.
