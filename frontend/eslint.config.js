import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: [
      'src/components/SwipeToast.jsx',
      'src/components/BellToggle.jsx',
      'src/components/GlideSelect.jsx',
      'src/components/CodeSlots.jsx',
      'src/components/PulseHeart.jsx',
      'src/components/PeekRating.jsx',
      'src/components/Stepper.jsx',
    ],
    rules: {
      'no-empty': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
