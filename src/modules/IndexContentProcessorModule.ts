import {App, MarkdownRenderChild, MarkdownRenderer, TAbstractFile, TFile} from "obsidian";
import FolderIndexPlugin from "../main";
import {MarkdownTextRenderer} from "../types/MarkdownTextRenderer";


export class IndexContentProcessorModule extends MarkdownRenderChild {
	constructor(
		private readonly app: App,
		private readonly plugin: FolderIndexPlugin,
		private readonly filePath: string,
		private readonly container: HTMLElement
	) {
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
		const folder: TAbstractFile | null = this.app.vault.getAbstractFileByPath(this.filePath)
		if (folder instanceof TFile) {
			const files = folder.parent?.children ?? []
			const renderer = new MarkdownTextRenderer(this.plugin, this.app)
			await MarkdownRenderer.renderMarkdown(renderer.buildMarkdownText(files), this.container, this.filePath, this)

			// Decode '%23' in data-href back to '#' and replace Obsidian's click handler with openFile() to bypass its '#'-splitting link resolver.
			const app = this.app
			this.container.querySelectorAll<HTMLAnchorElement>("a.internal-link").forEach(a => {
				try {
					const dh = a.getAttribute("data-href") ?? ""
					if (!dh.includes("%")) return
					const decoded = decodeURIComponent(dh)
					const file = app.vault.getAbstractFileByPath(decoded)
						?? app.vault.getAbstractFileByPath(decoded.replace(/\.md$/, ""))
					if (!(file instanceof TFile)) return
					const clone = a.cloneNode(true) as HTMLAnchorElement
					clone.setAttribute("data-href", decoded)
					clone.setAttribute("href", decoded)
					const targetFile = file
					clone.addEventListener("click", e => {
						e.preventDefault()
						e.stopPropagation()
						app.workspace.getLeaf(false).openFile(targetFile)
					})
					clone.addEventListener("mouseover", e => {
						e.stopPropagation()
					})
					a.parentNode?.replaceChild(clone, a)
				} catch {
					// ignore errors on individual links — the rest still render
				}
			})
		}
	}


}