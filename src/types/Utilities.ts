import {TFile} from "obsidian";
import FolderIndexPlugin from "../main";
import {CodeBlockConfig} from "../models/CodeBlockConfig";

export function isIndexFileWithFile(file: TFile) {
	return isIndexFile(file.path)
}

export function isIndexFile(path: string) {
	if (isExcludedPath(path))
		return false
	const pathParts = path.split(/\//)
	if (pathParts[0] == FolderIndexPlugin.PLUGIN.settings.rootIndexFile)
		return true
	if (pathParts.length < 2)
		return false
	const fileName = pathParts[pathParts.length - 1]
	if (FolderIndexPlugin.PLUGIN.settings.indexFileUserSpecified) {
		return fileName == FolderIndexPlugin.PLUGIN.settings.indexFilename + ".md";
	}
	const folderName = pathParts[pathParts.length - 2] + ".md"
	return fileName == folderName || fileName == FolderIndexPlugin.PLUGIN.settings.rootIndexFile;
}

export function isExcludedPath(path: string, codeBlockConfig?: CodeBlockConfig) {
	// Check exact folder matches first
	for (const excludedFolder of FolderIndexPlugin.PLUGIN.settings.excludeFolders) {
		if (excludedFolder == "")
			continue
		if (RegExp(`^${excludedFolder}$`).test(path)) {
			return true;
		}
	}

	// Then check pattern matches
	for (const pattern of FolderIndexPlugin.PLUGIN.settings.excludePatterns) {
		if (pattern == "")
			continue
		// Escape special characters in the pattern except * which we'll use as wildcard
		const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
		if (new RegExp(escapedPattern, 'i').test(path)) {
			return true;
		}
	}

	// Finally check code block ignore patterns if provided
	if (codeBlockConfig?.ignore) {
		for (const pattern of codeBlockConfig.ignore) {
			if (pattern == "") continue;
			// Escape special characters in the pattern except * which we'll use as wildcard
			const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
			if (new RegExp(escapedPattern, 'i').test(path)) {
				return true;
			}
		}
	}

	return false
}
