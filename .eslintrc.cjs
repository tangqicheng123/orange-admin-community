/* OrangeAdmin ESLint 配置（Vue3 + TS）
 * 注意：.eslintrc-auto-import.json 由 unplugin-auto-import 在 dev/build 时自动生成，
 * 提供 ElMessage / ref 等自动引入全局变量，避免 no-undef 报错。 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    './.eslintrc-auto-import.json',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist', 'node_modules', 'src/auto-imports.d.ts', 'src/components.d.ts'],
}
