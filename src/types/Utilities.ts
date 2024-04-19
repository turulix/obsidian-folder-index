import {TFile} from "obsidian";
import FolderIndexPlugin from "../main";
import * as typescriptPath from "path";

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
	const folderName = pathParts[pathParts.length - 2] + ".md"
	return fileName == folderName || fileName == FolderIndexPlugin.PLUGIN.settings.rootIndexFile;
}

export function isExcludedPath(path: string) {
	for (let excludedFolder of FolderIndexPlugin.PLUGIN.settings.excludeFolders) {
		if (excludedFolder == "")
			continue

		if (excludedFolder.endsWith("/*"))
			excludedFolder = excludedFolder.slice(0, -1) + ".*";
		
		if (RegExp(`^${excludedFolder}$`).test(path) || RegExp(`^${excludedFolder}$`).test(typescriptPath.dirname(path)))
			return true;
	}
	return false
}
