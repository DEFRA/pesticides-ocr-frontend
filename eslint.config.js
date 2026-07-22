import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true,
    noStyle: false
  }),
  {
    rules: {
      '@stylistic/space-before-function-paren': 'off'
    }
  }
]
