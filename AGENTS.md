# tinyDialog.com CLI

The CLI interacts via user-API-token authenticated REST API with tinyDialog.com.
Published as NPM package and Standalone Executables via GitHub Actions Workflow.

## Development

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

---
For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
