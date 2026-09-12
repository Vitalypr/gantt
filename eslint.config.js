import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-exe', 'dist-single', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This project does not run the React Compiler, so a compiler bailout is not a build
      // failure. It IS a real signal that the six pointer-drag hooks in src/hooks/ would
      // not compile — they assign handlers to DOM properties inside a useCallback. Kept
      // visible as a warning; tracked as roadmap item R-LINT.
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // Config and tooling files run in Node, not the browser.
    files: ['*.config.{js,ts}', 'launcher/**/*.cjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
