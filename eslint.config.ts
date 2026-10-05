import stylistic from '@stylistic/eslint-plugin'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import type { Linter } from 'eslint'
import prettier from 'eslint-config-prettier/flat'
import pluginVue from 'eslint-plugin-vue'

const layer = (files: string[], forbidden: string[], message: string): Linter.Config => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: forbidden,
            message,
          },
        ],
      },
    ],
  },
})

/** Statements that close a thought: they get a blank line around them. */
const CHUNKS = [
  'block-like',
  'multiline-const',
  'multiline-let',
  'multiline-expression',
  'multiline-export',
  'multiline-type',
  'interface',
  'class',
]

/** Formatting that Prettier leaves open; it runs after Prettier and never contradicts it. */
const codeStyle: Linter.Config = {
  plugins: { '@stylistic': stylistic },
  rules: {
    curly: ['error', 'all'],
    '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
    '@stylistic/padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: '*',
        next: ['return', 'throw', ...CHUNKS],
      },
      {
        blankLine: 'any',
        prev: ['singleline-const', 'singleline-let'],
        next: ['return', 'throw', 'block-like', 'multiline-expression'],
      },
      {
        blankLine: 'always',
        prev: CHUNKS,
        next: '*',
      },
      {
        blankLine: 'always',
        prev: 'import',
        next: '*',
      },
      {
        blankLine: 'any',
        prev: 'import',
        next: 'import',
      },
    ],
    '@stylistic/lines-between-class-members': [
      'error',
      {
        enforce: [
          {
            blankLine: 'always',
            prev: 'method',
            next: '*',
          },
          {
            blankLine: 'always',
            prev: '*',
            next: 'method',
          },
        ],
      },
    ],
    '@stylistic/object-curly-newline': [
      'error',
      {
        ObjectExpression: {
          multiline: true,
          minProperties: 2,
          consistent: true,
        },
        ObjectPattern: {
          multiline: true,
          consistent: true,
        },
        ImportDeclaration: {
          multiline: true,
          consistent: true,
        },
        ExportDeclaration: {
          multiline: true,
          consistent: true,
        },
      },
    ],
    '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
    'vue/padding-line-between-tags': [
      'error',
      [
        {
          blankLine: 'consistent',
          prev: '*',
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*:multi-line',
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: '*:multi-line',
        },
      ],
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: ':function > TSTypeAnnotation.returnType > TSVoidKeyword',
        message: 'Leave void return types to inference.',
      },
    ],
  },
}

export default withVueTs(
  { ignores: ['dist/**', 'dist-desktop/**', 'dist-electron/**', 'release/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    files: [
      'src/**/*.{ts,vue}',
      'tests/**/*.ts',
      'scripts/**/*.ts',
      'electron/**/*.ts',
      'supabase/functions/_shared/**/*.ts',
      '*.config.ts',
    ],
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  },
  {
    // Edge entry points use Deno and are outside the application's TypeScript projects.
    files: ['supabase/functions/*/index.ts'],
    languageOptions: { parserOptions: { projectService: false } },
  },
  layer(
    ['src/core/**', 'src/content/**'],
    ['@/domain/*', '@/simulation/*', '@/rendering/*', '@/application/*', '@/ui/*', 'vue', 'pixi.js'],
    'core and content are the innermost layers',
  ),
  layer(
    ['src/domain/**'],
    ['@/simulation/*', '@/rendering/*', '@/application/*', '@/ui/*', 'vue', 'pixi.js'],
    'domain must stay framework-free',
  ),
  layer(
    ['src/simulation/**'],
    ['@/rendering/*', '@/application/*', '@/ui/*', 'vue', 'pixi.js'],
    'simulation must run headless',
  ),
  layer(['src/rendering/**'], ['@/application/*', '@/ui/*', 'vue'], 'rendering must not depend on the UI'),
  prettier,
  codeStyle,
)
