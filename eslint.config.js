import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// no-restricted-imports 的 group 由 ignore 包按 gitignore 语义匹配，不支持
// extglob 负向匹配；「仅放行 4 个 scenes 根共享模块、禁止导入其他 scenes
// 目录」的跨场景禁令只能用 regex（负向前瞻）表达。按文件所在深度，
// `../<scene>`（深度 1）与 `../../<scene>`（深度 ≥2，如 renderer/）都解析到
// src/scenes/<scene>，两种前缀都须覆盖；深度 ≥2 时同一前缀也可能解析到
// src/ 分层目录，负向前瞻须一并放行（分层目录的合法性由各自专属 group 约束）。
const crossSceneImportMessage =
  'Scene modules cannot import other scenes. Shared code belongs in the scenes root modules (types/page-utils/scene-entry-helpers/view-base).';

// 深度 1 场景文件（src/scenes/<id>/*.ts）：`../X` 解析到 src/scenes/X，
// 仅放行 4 个根共享模块（匹配模块名，可选 `.ts` 扩展名；子路径一律禁止）。
// 注意前缀后须排除 `.`，否则 `^\.\./` 会前缀命中 `../../…`。
const sharedSceneRootModules =
  'types(?:\\.ts)?$|page-utils(?:\\.ts)?$|scene-entry-helpers(?:\\.ts)?$|view-base(?:\\.ts)?$';
const crossSceneImportDepth1 = {
  regex: `^\\.\\./(?!\\.)(?!${sharedSceneRootModules})`,
  message: crossSceneImportMessage
};

// 深度 ≥2 场景文件（renderer/ 等）：`../../X`、`../../../X`、`../../../../X`
// 按深度解析到 src/scenes/X 或 src/X；负向前瞻放行根共享模块与 src 各一级
// 目录（app/catalog/ui 是否合法由各自专属 group 约束，此处只负责不重复命中）。
const srcLayerDirs =
  'app(?:$|/)|catalog(?:$|/)|core(?:$|/)|instruments(?:$|/)|pages(?:$|/)|platform(?:$|/)|styles(?:$|/)|ui(?:$|/)';
const crossSceneImportDeep = [
  `^\\.\\./\\.\\./(?!\\.)(?!${sharedSceneRootModules}|${srcLayerDirs})`,
  `^\\.\\./\\.\\./\\.\\./(?!\\.)(?!${sharedSceneRootModules}|${srcLayerDirs})`,
  `^\\.\\./\\.\\./\\.\\./\\.\\./(?!\\.)(?!${sharedSceneRootModules}|${srcLayerDirs})`
].map((regex) => ({ regex, message: crossSceneImportMessage }));

// 以下三组在两个 scenes 规则块间共享：深度 1 场景文件同时命中两块，而同一
// 规则的 flat config 以后块「整体替换」生效（不做深合并），因此后块必须重复
// 全部禁令；提取为常量防止两块漂移。
const sceneAppImportGroup = {
  group: [
    '../../app/*',
    '../../app/**',
    '../../../app/*',
    '../../../app/**',
    '../../../../app/*',
    '../../../../app/**'
  ],
  message: 'Scene layer cannot import app layer. Use platform/* instead.'
};

const sceneUiImportGroup = {
  group: [
    '../../ui/*',
    '../../ui/**',
    '../../../ui/*',
    '../../../ui/**',
    '../../../../ui/*',
    '../../../../ui/**'
  ],
  message: 'Scene layer cannot import ui layer.'
};

const sceneCatalogImportGroup = {
  group: [
    '../../catalog/*',
    '../../catalog/**',
    '../../../catalog/*',
    '../../../catalog/**',
    '../../../../catalog/*',
    '../../../../catalog/**'
  ],
  message:
    'Scene layer cannot import catalog layer. Scenes are auto-discovered by the catalog registry.'
};

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
                '../../catalog/**',
                '../instruments/*',
                '../instruments/**',
                '../../instruments/*',
                '../../instruments/**'
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
            },
            {
              group: [
                '../core/*',
                '../core/**',
                '../../core/*',
                '../../core/**'
              ],
              message: 'Catalog layer cannot import core layer.'
            },
            {
              group: [
                '../instruments/*',
                '../instruments/**',
                '../../instruments/*',
                '../../instruments/**'
              ],
              message: 'Catalog layer cannot import instruments layer.'
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
            sceneAppImportGroup,
            sceneUiImportGroup,
            sceneCatalogImportGroup,
            ...crossSceneImportDeep
          ]
        }
      ]
    }
  },
  {
    // 深度 1 场景文件（src/scenes/<id>/*.ts）的跨场景导入形如 `../<scene>/…`，
    // 与深度 2 文件（renderer/ 等）指向同场景父目录的 `../scene.sim` 字符串
    // 同形，无法在单一规则块内区分，因此单独成块。深度 1 文件同时命中上一块
    // 与本块，同一规则的配置以后块整体替换生效，故本块重复全部场景禁令。
    files: ['src/scenes/*/*.ts', 'src/scenes/*/*.tsx'],
    ignores: ['src/scenes/*/page.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            sceneAppImportGroup,
            sceneUiImportGroup,
            sceneCatalogImportGroup,
            ...crossSceneImportDeep,
            crossSceneImportDepth1
          ]
        }
      ]
    }
  },
  {
    // page.ts 允许依赖 app/ui（上方两块均排除 page.ts），但跨场景导入与
    // catalog 对全部场景文件（含 page.ts）一律禁止，与
    // tests/unit/architecture-boundaries.spec.ts 的契约一致。
    files: ['src/scenes/**/page.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            sceneCatalogImportGroup,
            ...crossSceneImportDeep,
            crossSceneImportDepth1
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
            },
            {
              group: [
                '../catalog/*',
                '../catalog/**',
                '../../catalog/*',
                '../../catalog/**'
              ],
              message:
                'Platform layer must stay independent from catalog layer.'
            },
            {
              group: [
                '../instruments/*',
                '../instruments/**',
                '../../instruments/*',
                '../../instruments/**'
              ],
              message:
                'Platform layer must stay independent from instruments layer.'
            }
          ]
        }
      ]
    }
  },
  prettier
);
