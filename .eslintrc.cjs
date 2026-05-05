module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ]
  },
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', '.worktrees/', '**/*.css'],
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
      files: [
        'src/scenes/**/scene.meta.ts',
        'src/scenes/**/scene.sim.ts',
        'src/scenes/**/scene.entry.ts',
        'src/scenes/**/scene.view.ts',
        'src/scenes/**/controls-schema.ts'
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../app/*', '../../app/**', '../../../app/*', '../../../app/**'],
                message: 'Scene layer cannot import app layer. Use platform/* instead.'
              },
              {
                group: ['../../ui/*', '../../ui/**', '../../../ui/*', '../../../ui/**'],
                message: 'Scene layer cannot import ui layer.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/instruments/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../app/*', '../app/**', '../../app/*', '../../app/**'],
                message: 'Instruments layer must stay independent from app layer.'
              },
              {
                group: ['../ui/*', '../ui/**', '../../ui/*', '../../ui/**'],
                message: 'Instruments layer must stay independent from ui layer.'
              },
              {
                group: ['../scenes/*', '../scenes/**', '../../scenes/*', '../../scenes/**'],
                message: 'Instruments layer must stay independent from scenes layer.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/platform/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../app/*', '../app/**', '../../app/*', '../../app/**'],
                message: 'Platform layer must stay independent from app layer.'
              },
              {
                group: ['../ui/*', '../ui/**', '../../ui/*', '../../ui/**'],
                message: 'Platform layer must stay independent from ui layer.'
              },
              {
                group: ['../scenes/*', '../scenes/**', '../../scenes/*', '../../scenes/**'],
                message: 'Platform layer must stay independent from scenes layer.'
              }
            ]
          }
        ]
      }
    }
  ]
};
