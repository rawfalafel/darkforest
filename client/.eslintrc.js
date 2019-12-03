module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:react/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  globals: {
    // add as needed
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '(^_)',
        argsIgnorePattern: '(^_)',
      },
    ],

    eqeqeq: 'error',
    'react/jsx-no-undef': ['error', { allowGlobals: true }],
    'react-hooks/rules-of-hooks': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      modules: true,
      legacyDecorators: true,
    },
    sourceType: 'module',
  },
};
