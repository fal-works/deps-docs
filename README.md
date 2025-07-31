# @fal-works/deps-docs

Extracts and copies `README.md` and `LICENSE` files from all dependencies listed in your project's `package.json`, for easy review or compliance.

```text
deps-docs [--outdir <path>] [--verbose]
```

Default output directory: `./docs-deps`

Limitations: Does not search subdirectories recursively.

Requires: Node.js v22 or later.
