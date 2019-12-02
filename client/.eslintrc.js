module.exports = {
  extends: ['prettier', 'eslint:recommended', 'plugin:react/recommended'],
  plugins: ['react', 'react-hooks'],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  globals: {
    // add as needed
  },
  parser: 'babel-eslint',
  rules: {
    'no-var': 'error',
    eqeqeq: 'error',
    'no-unused-vars': [
      'error',
      {
        args: 'none',
        ignoreRestSiblings: true,
        argsIgnorePattern: '(^_)',
        varsIgnorePattern: '(^_)',
      },
    ],
    'prefer-const': [
      'warn',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: true,
      },
    ],

    'react/jsx-no-undef': ['error', { allowGlobals: true }],
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',

    'react-hooks/rules-of-hooks': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
};
