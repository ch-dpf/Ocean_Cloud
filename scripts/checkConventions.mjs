import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
const errors = []
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name)) continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      visit(file)
      continue
    }
    if (!/\.tsx?$/.test(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    const moduleImport = source.match(
      /import styles from ['"](.+\.module\.css)['"]/,
    )?.[1]
    if (moduleImport) {
      const css = fs.readFileSync(path.resolve(directory, moduleImport), 'utf8')
      const classNames = new Set(
        [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1]),
      )
      for (const match of source.matchAll(/styles\.(\w+)/g)) {
        if (!classNames.has(match[1]))
          errors.push(file + ': CSS Module 缺少类 ' + match[1])
      }
    }
    const relative = file.replaceAll('\\', '/')
    if (source.split('\n').length > 220)
      errors.push(relative + ': 超过 220 行，请按职责拆分')
    if (
      file.endsWith('.tsx') &&
      !relative.includes('/routes/') &&
      !['main.tsx', 'App.tsx'].includes(entry.name) &&
      path.basename(directory) !== path.basename(entry.name, '.tsx')
    )
      errors.push(relative + ': 组件文件必须放在同名目录')
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function inspect(node) {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const name = node.moduleSpecifier.text
        if (name === 'axios' && !relative.startsWith('packages/http/'))
          errors.push(relative + ': 只能在 packages/http 内导入 Axios')
        if (name.includes('apps/') || /portal\/src|resources\/src/.test(name))
          errors.push(relative + ': 禁止跨应用导入实现')
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'fetch'
      )
        errors.push(relative + ': 统一使用 HTTP 封装，禁止直接 fetch')
      ts.forEachChild(node, inspect)
    }
    inspect(tree)
  }
}
visit('apps')
visit('packages')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else console.log('命名、文件长度和请求边界检查通过。')
