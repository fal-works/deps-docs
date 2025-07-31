#!/usr/bin/env node
import { access, glob, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

const projectRoot = process.cwd();

interface CliOptions {
	outdir: string;
	verbose: boolean;
}

function getCliOptions(): CliOptions {
	const { values } = parseArgs({
		options: {
			outdir: {
				type: "string",
				short: "o",
				default: "./docs-deps",
			},
			verbose: {
				type: "boolean",
				short: "v",
				default: false,
			},
		},
	});

	return values;
}

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function getLicenseFiles(packageDir: string): Promise<string[]> {
	try {
		const licenseFiles = [];
		for await (const file of glob("licen[cs]e*", { cwd: packageDir })) {
			licenseFiles.push(file);
		}
		return licenseFiles;
	} catch {
		return [];
	}
}

interface ProcessDependencyResult {
	filesCopiedCount: number;
}

/**
 * Copies README.md and LICENSE files from a package's
 * node_modules directory to the output directory.
 */
async function processDependency(
	packageName: string,
	outDirPath: string,
	verbose: boolean,
): Promise<ProcessDependencyResult> {
	const packageDir = join(projectRoot, "node_modules", packageName);
	const outputDir = join(outDirPath, packageName);
	await mkdir(outputDir, { recursive: true });

	let filesCopiedCount = 0;

	// Copy README.md if it exists
	const readmePath = join(packageDir, "README.md");
	const readmeOutputPath = join(outputDir, "README.md");
	if (await fileExists(readmePath)) {
		try {
			const readmeContent = await readFile(readmePath, "utf-8");
			await writeFile(readmeOutputPath, readmeContent, "utf-8");
			if (verbose) {
				console.log(`✓ Copied README.md for ${packageName}`);
			}
			filesCopiedCount++;
		} catch (error) {
			console.error(`✗ Failed to copy README.md for ${packageName}:`, error);
		}
	}

	// Copy LICENSE files
	const licenseFiles = await getLicenseFiles(packageDir);
	for (const licenseFile of licenseFiles) {
		const licensePath = join(packageDir, licenseFile);
		const licenseOutputPath = join(outputDir, licenseFile);
		try {
			const licenseContent = await readFile(licensePath, "utf-8");
			await writeFile(licenseOutputPath, licenseContent, "utf-8");
			if (verbose) {
				console.log(`✓ Copied ${licenseFile} for ${packageName}`);
			}
			filesCopiedCount++;
		} catch (error) {
			console.error(`✗ Failed to copy ${licenseFile} for ${packageName}:`, error);
		}
	}

	if (filesCopiedCount === 0 && verbose) {
		console.log(`- No README.md or LICENSE files found for ${packageName}`);
	}

	return { filesCopiedCount };
}

/**
 * Reads package.json dependencies and processes each package
 * to copy their documentation files.
 */
async function extractNpmReadmes(options: CliOptions): Promise<void> {
	const packageJsonPath = join(projectRoot, "package.json");
	const packageJsonContent = await readFile(packageJsonPath, "utf-8");
	const packageJson: PackageJson = JSON.parse(packageJsonContent);

	const allDependencies = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};

	if (Object.keys(allDependencies).length === 0) {
		if (options.verbose) console.log("No dependencies found in package.json");
		return;
	}

	const outDirPath = join(projectRoot, options.outdir);
	await mkdir(outDirPath, { recursive: true });

	let copiedCount = 0;
	let skippedCount = 0;

	for (const packageName of Object.keys(allDependencies)) {
		const result = await processDependency(packageName, outDirPath, options.verbose);
		if (result.filesCopiedCount > 0) {
			copiedCount++;
		} else {
			skippedCount++;
		}
	}

	console.log(`Processed ${copiedCount} packages, skipped ${skippedCount}. Output: ${outDirPath}`);
}

const options = getCliOptions();
extractNpmReadmes(options).catch((error) => {
	console.error("Error extracting dependency documents:", error);
	process.exit(1);
});
