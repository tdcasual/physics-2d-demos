module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', '.worktrees/'],
  overrides: [
    {
      files: ['src/core/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../app/*', '../app/**', '../../app/*', '../../app/**'],
                message: 'Core layer must stay independent from app layer.'
              },
              {
                group: [
                  '../scenes/**/page',
                  '../scenes/**/page.ts',
                  '../../scenes/**/page',
                  '../../scenes/**/page.ts'
                ],
                message: 'Core layer cannot depend on scene page entry modules.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/scenes/**/scene.sim.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../app/*', '../../app/**', '../../../app/*', '../../../app/**'],
                message: 'Simulation layer cannot import app layer.'
              },
              {
                group: ['../../ui/*', '../../ui/**', '../../../ui/*', '../../../ui/**'],
                message: 'Simulation layer cannot import ui layer.'
              }
            ]
          }
        ]
      }
    }
  ]
};
