import tseslint from '@typescript-eslint/eslint-plugin';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const typescriptConfigs = tseslint.configs['flat/recommended'].map(
  (config) => ({
    ...config,
    files: ['**/*.ts'],
  }),
);

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...typescriptConfigs,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettierRecommended,
];
