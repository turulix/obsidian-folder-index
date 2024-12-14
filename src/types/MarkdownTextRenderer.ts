import {App, HeadingCache, TAbstractFile, TFile, TFolder} from "obsidian";
import FolderIndexPlugin from "../main";
import {isExcludedPath, isIndexFile} from "./Utilities";
import {SortBy} from "../models/PluginSettingsTab";
import {CodeBlockConfig} from "../models/CodeBlockConfig";

type FileTree = (TFile | TFolder)[]
type HeaderWrapper = {
	header: HeadingCache,
	parent: HeaderWrapper | null
	children: HeaderWrapper[]
}

export class MarkdownTextRenderer {
	constructor(private plugin: FolderIndexPlugin, private app: App) {
		this.plugin = plugin
		this.app = app
	}

	public buildMarkdownText(filesInFolder: TAbstractFile[], codeBlockConfig?: CodeBlockConfig): string {
		const fileTree = this.buildFileTree(filesInFolder, codeBlockConfig);
		return this.buildStructureMarkdownText(fileTree, 0, codeBlockConfig);
	}

	private buildStructureMarkdownText(fileTree: FileTree, indentLevel: number, codeBlockConfig?: CodeBlockConfig): string {
		let markdownText = ""

		for (const file of fileTree) {
			if(isExcludedPath(file.path, codeBlockConfig)){
				continue
			}
			if (file instanceof TFolder && this.plugin.settings.recursiveIndexFiles) {
				// Create a deep copy of the children array
				let children = file.children;
				const indexFile = this.checkIfFolderHasIndexFile(file.children)

				if (indexFile) {
					children = file.children.filter((child) => child.path != indexFile.path)
					markdownText += this.buildContentMarkdownText(indexFile, indentLevel, true)
				} else {
					markdownText += this.buildMarkdownLinkString(file.name, null, indentLevel, true)
				}
				if (this.plugin.settings.recursionLimit === -1 || indentLevel < this.plugin.settings.recursionLimit) {
					markdownText += this.buildStructureMarkdownText(this.buildFileTree(children, codeBlockConfig), indentLevel + 1, codeBlockConfig)
				}
			}
			if (file instanceof TFile) {
				if (isIndexFile(file.path)) {
					continue;
				}
				markdownText += this.buildContentMarkdownText(file, indentLevel)
			}
		}

		return markdownText
	}

	private buildContentMarkdownText(file: TFile, indentLevel: number, isFolder = false): string {
		let markdownText = ""
		markdownText += this.buildMarkdownLinkString(this.getTitleFromPath(file.path), encodeURI(file.path), indentLevel, isFolder)

		const headers: HeadingCache[] | null = this.app.metadataCache.getFileCache(file)?.headings ?? []
		if (headers && !this.plugin.settings.disableHeadlines) {
			const headerTree = this.buildHeaderTree(headers)
			if (this.plugin.settings.headlineLimit !== 0) {
				markdownText += this.buildHeaderMarkdownText(file, headerTree, indentLevel + 1, 1)
			}
		}

		return markdownText
	}

	private buildHeaderMarkdownText(file: TFile, headerTree: HeaderWrapper[], indentLevel: number, headlineLevel: number): string {
		let markdownText = ""

		if (this.plugin.settings.sortHeaders === SortBy.Alphabetically) {
			headerTree.sort((a, b) => a.header.heading.localeCompare(b.header.heading))
		} else if (this.plugin.settings.sortHeaders === SortBy.ReverseAlphabetically) {
			headerTree.sort((a, b) => b.header.heading.localeCompare(a.header.heading))
		}

		for (const headerWrapper of headerTree) {
			markdownText += this.buildMarkdownLinkString(
				headerWrapper.header.heading,
				encodeURI(file.path) + this.buildHeaderChain(headerWrapper),
				indentLevel
			)
			if (headlineLevel < this.plugin.settings.headlineLimit) {
				markdownText += this.buildHeaderMarkdownText(file, headerWrapper.children, indentLevel + 1, headlineLevel + 1)
			}
		}

		return markdownText
	}

	private buildMarkdownLinkString(name: string, path: string | null, indentLevel: number, isFolder = false): string {
		const indentText = this.buildIndentLevel(indentLevel)
		const settings = this.plugin.settings
		const symbol = settings.useBulletPoints ? "-" : "1."
		let link = `${indentText}${symbol} ${settings.includeFileContent ? "!" : ""}`
		if (isFolder) {
			if (settings.renderFolderItalic) {
				name = `*${name}*`
			}
			if (settings.renderFolderBold) {
				name = `**${name}**`
			}
		}

		if (path) {
			link += `[${name}](${path})\n`
		} else {
			link += `${name}\n`
		}

		return link
	}

	private getTitleFromPath(path: string): string {
		const file = this.app.vault.getAbstractFileByPath(path)
		if (file instanceof TFile) {
			const cache = this.app.metadataCache.getFileCache(file)
			if (cache) {
				return cache.frontmatter?.title ?? file.basename
			}
			return file.basename
		}
		return "Something went wrong. Please report this issue."
	}

	private buildHeaderChain(header: HeaderWrapper): string {
		if (header.parent) {
			return `${this.buildHeaderChain(header.parent)}#${encodeURI(header.header.heading)}`
		}
		return `#${encodeURI(header.header.heading)}`
	}

	private checkIfFolderHasIndexFile(children: TAbstractFile[]): TFile | null {
		for (const file of children) {
			if (file instanceof TFile) {
				if (isIndexFile(file.path)) {
					return file
				}
			}
		}
		return null
	}

	private buildHeaderTree(headers: HeadingCache[]): HeaderWrapper[] {
		const headerTree: HeaderWrapper[] = []
		for (let i = 0; i < headers.length; i++) {
			if (headers[i].level == 1) {
				const wrappedHeader = {
					parent: null,
					header: headers[i],
					children: [],
				} as HeaderWrapper
				wrappedHeader.children = this.getHeaderChildren(headers, i + 1, wrappedHeader)
				headerTree.push(wrappedHeader)
			}
		}
		return headerTree
	}

	private getHeaderChildren(headers: HeadingCache[], startIndex: number, parentHeader: HeaderWrapper) {
		const children: HeaderWrapper[] = []
		if (startIndex > headers.length) {
			return children
		}

		for (let i = startIndex; i < headers.length; i++) {
			const header = headers[i]
			if (header.level <= parentHeader.header.level) {
				break;
			}
			if (header.level === parentHeader.header.level + 1) {
				const child: HeaderWrapper = {
					header: header,
					parent: parentHeader,
					children: []
				}
				child.children = this.getHeaderChildren(headers, i + 1, child)
				children.push(child)
			}
		}
		return children
	}

	private buildFileTree(filesInFolder: TAbstractFile[], codeBlockConfig?: CodeBlockConfig): FileTree {
		const fileTree: FileTree = [];
		for (const file of filesInFolder) {
			if (codeBlockConfig?.ignore && this.isPathIgnored(file.path, codeBlockConfig.ignore)) {
				continue;
			}
			if (file instanceof TFolder && this.plugin.settings.recursiveIndexFiles) {
				// 使用本地配置的递归层级限制（如果有的话），否则使用全局设置
				const currentLimit = codeBlockConfig?.recursionLimit ?? this.plugin.settings.recursionLimit;
				if (currentLimit !== -1 && this.getFolderDepth(file) >= currentLimit) {
					continue;
				}
				fileTree.push(file)
			}
			if (file instanceof TFile) {
				if (this.plugin.settings.markdownOnly && file.extension !== 'md') {
					continue;
				}
				fileTree.push(file)
			}
		}
		if (this.plugin.settings.sortIndexFiles === SortBy.Alphabetically) {
			fileTree.sort((a, b) => a.name.localeCompare(b.name))
		} else if (this.plugin.settings.sortIndexFiles === SortBy.ReverseAlphabetically) {
			fileTree.sort((a, b) => b.name.localeCompare(a.name))
		} else if (this.plugin.settings.sortIndexFiles === SortBy.Natural) {
			fileTree.sort((a, b) => this.naturalSort(a.name, b.name))
		} else if (this.plugin.settings.sortIndexFiles === SortBy.ReverseNatural) {
			fileTree.sort((a, b) => this.naturalSort(b.name, a.name))
		}
		return fileTree
	}

	private getFolderDepth(folder: TFolder): number {
		let depth = 0;
		let current = folder;
		while (current.parent) {
			depth++;
			current = current.parent;
		}
		return depth;
	}

	private isPathIgnored(path: string, ignorePatterns: string[]): boolean {
		for (const pattern of ignorePatterns) {
			if (pattern === "") continue;
			// Escape special characters in the pattern except * which we'll use as wildcard
			const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
			if (new RegExp(escapedPattern, 'i').test(path)) {
				return true;
			}
		}
		return false;
	}

	private naturalSort(a: string, b: string): number {
		const re = /(\d+)|(\D+)/g;
		const aParts = a.split(re).filter((item) => item !== undefined && item.length > 0);
		const bParts = b.split(re).filter((item) => item !== undefined && item.length > 0)
	
		for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
			const aPart = aParts[i];
			const bPart = bParts[i];
	
			if (!isNaN(Number(aPart)) && !isNaN(Number(bPart))) {
				const numA = Number(aPart);
				const numB = Number(bPart);
				if (numA !== numB) {
					return numA - numB;
				}
			} else {
				if (aPart !== bPart) {
					return aPart.localeCompare(bPart);
				}
			}
		}
	
		return aParts.length - bParts.length;
	}

	private buildIndentLevel(indentLevel: number): string {
		let indentText = ""
		for (let j = 0; j < indentLevel; j++) {
			indentText += "\t"
		}
		return indentText
	}
}
