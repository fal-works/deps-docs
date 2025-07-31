import { defineConfig } from "tsdown";

export default defineConfig([
	{
		format: "esm",
		dts: false,
		entry: { bin: "src/bin.ts" },
		outDir: "dist",
		platform: "node",
		target: ["node22", "es2022"],
	},
]);
