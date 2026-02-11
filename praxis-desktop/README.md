# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

## CI Gate (Stage 9D)
- Unit tests: `npm test` (Vitest run mode).
- Verify gate: `npm run test:verify-safety` (Stage 8 verify headlessly against `electron/verify/fixtures/ci/praxis-desktop`).
- CI runs both in order: `npm test` then `npm run test:verify-safety`.
- Stage 9C drift protection adds tests for verify JSON contract shape and CI/script integrity.
- Stage 9D hygiene gate blocks PRs that delete required docs (`README.md`, `docs/Roadmap.md`, `docs/Spec.md`, `docs/DECISIONS.md`) and emits non-blocking warnings for monitored runtime-file changes.
- Local doc-deletion check:
  - `git fetch origin main --depth=1`
  - `git diff --name-status origin/main...HEAD`
- Scope: scripts/CI/docs only; runtime behavior is unchanged.
