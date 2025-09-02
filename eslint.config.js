export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        addEventListener: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URLSearchParams: 'readonly',
        btoa: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }]
    }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        Event: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        self: 'readonly',
        caches: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }]
    }
  }
];
