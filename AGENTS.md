# Ocean_Cloud 工作约定

- 遵循 docs/development-standards.md 和 docs/http-client.md。
- 保持应用独立构建，不跨 apps 导入业务实现。
- 组件同名目录、命名导出、显式 Props、就近 CSS Modules。
- 业务请求统一使用应用 services/httpClient.ts，不直接使用 Axios 或 fetch。
- 错误必须保留 Promise rejection；接口 404 不跳转页面 404。
- 改动后执行 npm run check，涉及 UI 验证浏览器行为。
- 测试文件只在本地保留，不提交或上传；npm run check 不依赖本地测试脚本。
- 所有中文文件使用 UTF-8。工具直接运行，禁止调用 RTK。
