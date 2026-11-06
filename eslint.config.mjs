// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', 'apps/avatar-unity/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // DESIGN_SYSTEM.md §0-1: 모바일 UI 코드에 색 리터럴을 쓰지 않는다. 토큰(useTheme)만 쓴다.
    files: ['apps/mobile/src/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: '색 리터럴 금지. useTheme()의 color 토큰을 쓰세요 (docs/DESIGN_SYSTEM.md §0).',
        },
        {
          selector: "TemplateLiteral > TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message: '색 리터럴 금지. useTheme()의 color 토큰을 쓰세요 (docs/DESIGN_SYSTEM.md §0).',
        },
      ],
    },
  },
);
