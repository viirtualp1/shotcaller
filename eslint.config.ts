import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import type { Linter } from 'eslint'
import prettier from 'eslint-config-prettier/flat'
import pluginVue from 'eslint-plugin-vue'

const layer = (files: string[], forbidden: string[], message: string): Linter.Config => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: forbidden, message }] }],
  },
})

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
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
)
