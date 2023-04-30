import {App, HeadingCache, MarkdownRenderChild, MarkdownRenderer, TAbstractFile, TFile, TFolder} from "obsidian";
import FolderIndexPlugin from "../main";

type FileTree = (TFile | TFolder)[]
type HeaderWrapper = {
	header: HeadingCache,
	parent: HeaderWrapper | null
	children: HeaderWrapper[]
}

export class IndexContentRenderer extends MarkdownRenderChild {
	constructor(private app: App, private plugin: FolderIndexPlugin, private filePath: string, private container: HTMLElement) {
		super(container)
		this.app = app
		this.plugin = plugin
		this.filePath = filePath
		this.container = container
	}

	async onload() {
		await this.render()
		this.plugin.eventManager.on("settingsUpdate", this.triggerRerender.bind(this));
		this.plugin.registerEvent(this.app.vault.on("rename", this.triggerRerender.bind(this)))
		this.app.workspace.onLayoutReady(() => {
			this.plugin.registerEvent(this.app.vault.on("create", this.triggerRerender.bind(this)))
		})
		this.plugin.registerEvent(this.app.vault.on("delete", this.triggerRerender.bind(this)))
	}


	async onunload() {
		this.plugin.eventManager.off("settingsUpdate", this.onSettingsUpdate.bind(this))
	}

	public onSettingsUpdate() {
		this.render().then()
	}

	public triggerRerender() {
		this.render().then()
	}

	private async render() {
		this.container.empty()
		const folder: TAbstractFile = this.app.vault.getAbstractFileByPath(this.filePath)
		if (folder instanceof TFile) {
			const files = folder.parent.children
			await MarkdownRenderer.renderMarkdown(this.buildMarkdownText(files), this.container, this.filePath, this)
		}
	}

	private buildMarkdownText(filesInFolder: TAbstractFile[]): string {
		const fileTree = this.buildFileTree(filesInFolder);
		return this.buildStructureMarkdownText(fileTree, 0);
	}

	private buildStructureMarkdownText(fileTree: FileTree, indentLevel: number): string {
		let markdownText = ""

		for (const file of fileTree) {
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
				markdownText += this.buildStructureMarkdownText(this.buildFileTree(children), indentLevel + 1)
			}
			if (file instanceof TFile) {
				if (this.checkIfIndexFile(file)) {
					continue;
				}
				markdownText += this.buildContentMarkdownText(file, indentLevel)
			}
		}

		return markdownText
	}

	private buildContentMarkdownText(file: TFile, indentLevel: number, isFolder = false): string {
		let markdownText = ""
		markdownText += this.buildMarkdownLinkString(file.basename, encodeURI(file.path), indentLevel, isFolder)

		const headers: HeadingCache[] | null = this.app.metadataCache.getFileCache(file)?.headings
		if (headers && !this.plugin.settings.disableHeadlines) {
			const headerTree = this.buildHeaderTree(headers)
			markdownText += this.buildHeaderMarkdownText(file, headerTree, indentLevel + 1)
		}

		return markdownText
	}

	private buildHeaderMarkdownText(file: TFile, headerTree: HeaderWrapper[], indentLevel: number): string {
		let markdownText = ""

		if (this.plugin.settings.sortHeadersAlphabetically) {
			headerTree.sort((a, b) => a.header.heading.localeCompare(b.header.heading))
		}

		for (const headerWrapper of headerTree) {
			markdownText += this.buildMarkdownLinkString(
				headerWrapper.header.heading,
				encodeURI(file.path) + this.buildHeaderChain(headerWrapper),
				indentLevel
			)
			markdownText += this.buildHeaderMarkdownText(file, headerWrapper.children, indentLevel + 1)
		}

		return markdownText
	}

	private buildMarkdownLinkString(name: string, path: string | null, indentLevel: number, isFolder = false): string {
		const indentText = this.buildIndentLevel(indentLevel)
		const settings = this.plugin.settings
		const symbol = settings.useBulletPoints ? "-" : "1."
		let link = `${indentText}${symbol} ${settings.includeFileContent ? "!" : ""}`
		if(isFolder) {
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

	private buildHeaderChain(header: HeaderWrapper): string {
		if (header.parent) {
			return `${this.buildHeaderChain(header.parent)}#${encodeURI(header.header.heading)}`
		}
		return `#${encodeURI(header.header.heading)}`
	}


	private checkIfIndexFile(file: TFile): boolean {
		return file.basename == file.parent.name || file.name == this.plugin.settings.rootIndexFile;
	}

	private checkIfFolderHasIndexFile(children: TAbstractFile[]): TFile | null {
		for (const file of children) {
			if (file instanceof TFile) {
				if (this.checkIfIndexFile(file)) {
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

	// Gets all headers that are children of the parentHeader
	private getHeaderChildren(headers: HeadingCache[], startIndex: number, parentHeader: HeaderWrapper) {
		const children: HeaderWrapper[] = []
		if (startIndex > headers.length) {
			return children
		}
		for (let i = startIndex; i < headers.length; i++) {
			if (headers[i].level <= parentHeader.header.level) {
				return children
			}
			if (headers[i].level == parentHeader.header.level + 1) {
				const wrappedHeader = {
					parent: parentHeader,
					header: headers[i],
					children: [],
				} as HeaderWrapper
				wrappedHeader.children = this.getHeaderChildren(headers, i + 1, wrappedHeader)
				children.push(wrappedHeader)
			}
		}
		return children
	}

	private buildFileTree(filesInFolder: TAbstractFile[]): FileTree {
		const fileTree: FileTree = [];
		for (const file of filesInFolder) {
			if (file instanceof TFolder && this.plugin.settings.recursiveIndexFiles) {
				fileTree.push(file)
			}
			if (file instanceof TFile) {
				fileTree.push(file)
			}
		}
		if (this.plugin.settings.sortIndexFilesAlphabetically) {
			fileTree.sort((a, b) => a.name.localeCompare(b.name))
		}
		return fileTree
	}

	private buildIndentLevel(indentLevel: number): string {
		let indentText = ""
		for (let j = 0; j < indentLevel; j++) {
			indentText += "\t"
		}
		return indentText
	}

}
