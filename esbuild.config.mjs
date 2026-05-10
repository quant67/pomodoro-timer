import esbuild from "esbuild";
import { readFile, writeFile } from "fs/promises";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";
const cssSources = ["src/index.css", "src/App.css", "src/obsidian/plugin.css"];

async function writePluginStyles() {
	const styles = await Promise.all(cssSources.map((file) => readFile(file, "utf8")));
	await writeFile("styles.css", styles.join("\n\n"), "utf8");
}

const context = await esbuild.context({
	entryPoints: ["src/obsidian/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	loader: {
		".css": "empty",
	},
});

if (prod) {
	await context.rebuild();
	await writePluginStyles();
	process.exit(0);
} else {
	await context.watch();
	await writePluginStyles();
}
