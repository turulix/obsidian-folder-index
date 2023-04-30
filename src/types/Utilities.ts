import {TFile} from "obsidian";
import FolderIndexPlugin from "../main";

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
	debugger
	const pathParts = path.split(/\//)
	for (const excludedFolder of FolderIndexPlugin.PLUGIN.settings.excludeFolders) {
		if (excludedFolder == "")
			continue
		let folder = pathParts.slice(0, pathParts.length - 1).join("/")
		if (!folder.endsWith("/"))
			folder += "/"

		if (RegExp(`^${excludedFolder}/?$`).test(folder))
			return true;
	}
	return false
}
