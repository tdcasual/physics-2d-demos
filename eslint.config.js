import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.worktrees/',
      '**/*.css'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
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
                '../ui/*',
                '../ui/**',
                '../../ui/*',
                '../../ui/**',
                '../scenes/*',
                '../scenes/**',
                '../../scenes/*',
                '../../scenes/**',
                '../platform/*',
                '../platform/**',
                '../../platform/*',
                '../../platform/**',
                '../catalog/*',
                '../catalog/**',
                '../../catalog/*',
                '../../catalog/**'
              ],
              message:
                'Core layer must stay independent from upper and sibling layers.'
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
    // 深度说明见 scenes 规则注释：`../` 需按深度逐层列出。
    // ui 最深文件位于 src/ui/components/scene-controls/（相对 ui 根深度 3，
    // 需 `../../../`），因此列出到 `../../../`。
    files: ['src/ui/**/*.ts', 'src/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../app/*',
                '../app/**',
                '../../app/*',
                '../../app/**',
                '../../../app/*',
                '../../../app/**'
              ],
              message: 'UI layer cannot import app layer.'
            },
            {
              group: [
                '../scenes/*',
                '../scenes/**',
                '../../scenes/*',
                '../../scenes/**',
                '../../../scenes/*',
                '../../../scenes/**'
              ],
              message: 'UI layer cannot import scenes layer.'
            },
            {
              group: [
                '../catalog/*',
                '../catalog/**',
                '../../catalog/*',
                '../../catalog/**',
                '../../../catalog/*',
                '../../../catalog/**'
              ],
              message: 'UI layer cannot import catalog layer.'
            },
            {
              group: [
                '../instruments/*',
                '../instruments/**',
                '../../instruments/*',
                '../../instruments/**',
                '../../../instruments/*',
                '../../../instruments/**'
              ],
              message: 'UI layer cannot import instruments layer.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/catalog/**/*.ts', 'src/catalog/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../app/*', '../app/**', '../../app/*', '../../app/**'],
              message: 'Catalog layer cannot import app layer.'
            },
            {
              group: ['../ui/*', '../ui/**', '../../ui/*', '../../ui/**'],
              message: 'Catalog layer cannot import ui layer.'
            },
            {
              group: [
                '../scenes/*',
                '../scenes/**',
                '../../scenes/*',
                '../../scenes/**'
              ],
              message: 'Catalog layer cannot import scenes layer.'
            }
          ]
        }
      ]
    }
  },
  {
    // 覆盖场景目录下全部文件（含 renderer/ 等辅助文件），仅 page.ts 允许
    // 依赖 app/ui（由 page 自己的规则约束）。no-restricted-imports 的 glob
    // 不匹配 `.` 开头的路径段，因此 `../` 需要按深度逐层列出。
    files: ['src/scenes/**/*.ts', 'src/scenes/**/*.tsx'],
    ignores: ['src/scenes/**/page.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../app/*',
                '../../app/**',
                '../../../app/*',
                '../../../app/**',
                '../../../../app/*',
                '../../../../app/**'
              ],
              message:
                'Scene layer cannot import app layer. Use platform/* instead.'
            },
            {
              group: [
                '../../ui/*',
                '../../ui/**',
                '../../../ui/*',
                '../../../ui/**',
                '../../../../ui/*',
                '../../../../ui/**'
              ],
              message: 'Scene layer cannot import ui layer.'
            }
          ]
        }
      ]
    }
  },
  {
    // 深度说明见 scenes 规则注释。instruments 最深文件位于
    // src/instruments/<id>/renderer/（深度 3，需 `../../../`）。
    files: ['src/instruments/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../app/*',
                '../app/**',
                '../../app/*',
                '../../app/**',
                '../../../app/*',
                '../../../app/**'
              ],
              message: 'Instruments layer must stay independent from app layer.'
            },
            {
              group: [
                '../ui/*',
                '../ui/**',
                '../../ui/*',
                '../../ui/**',
                '../../../ui/*',
                '../../../ui/**'
              ],
              message: 'Instruments layer must stay independent from ui layer.'
            },
            {
              group: [
                '../scenes/*',
                '../scenes/**',
                '../../scenes/*',
                '../../scenes/**',
                '../../../scenes/*',
                '../../../scenes/**'
              ],
              message:
                'Instruments layer must stay independent from scenes layer.'
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
              group: [
                '../scenes/*',
                '../scenes/**',
                '../../scenes/*',
                '../../scenes/**'
              ],
              message: 'Platform layer must stay independent from scenes layer.'
            }
          ]
        }
      ]
    }
  },
  prettier
);
