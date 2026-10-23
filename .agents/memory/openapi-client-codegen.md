---
name: OpenAPI client codegen compatibility
description: Keep generated React Query hooks aligned with this workspace's TypeScript DOM libraries and runtime query version.
---

For generated OpenAPI clients, keep Orval targeting the installed TanStack Query major and include `dom.iterable` when generated request code uses iterable `Headers` methods.

**Why:** Code generation can complete while TypeScript fails because Orval defaults or DOM libraries do not match the workspace's actual dependencies. Explicit compatibility settings resolved the mismatch without hand-editing generated output.

**How to apply:** Before changing code generation or React Query dependencies, inspect the existing Orval and API-client TypeScript settings and preserve their version alignment.
