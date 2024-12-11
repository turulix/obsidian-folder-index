import {App, MarkdownRenderChild, MarkdownRenderer, TAbstractFile, TFile} from "obsidian";
import FolderIndexPlugin from "../main";
import {MarkdownTextRenderer} from "../types/MarkdownTextRenderer";
import {ExcludePatternManager} from "../types/ExcludePatternManager";

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
			const renderer = new MarkdownTextRenderer(
				this.plugin, 
				this.app,
				new ExcludePatternManager(this.plugin)
			)
			await MarkdownRenderer.renderMarkdown(renderer.buildMarkdownText(files), this.container, this.filePath, this)
		}
	}


}

export class CodeBlockProcessor extends MarkdownRenderChild {
	constructor(
		private readonly app: App,
		private readonly plugin: FolderIndexPlugin,
		private readonly filePath: string,
		private readonly container: HTMLElement,
		private readonly source: string
	) {
		super(container)
		this.app = app
		this.plugin = plugin
		this.filePath = filePath
		this.container = container
		this.source = source
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

	private parseCodeBlockParameters(source: string): { ignore?: string } {
		const lines = source.split('\n');
		const params: { ignore?: string } = {};
		
		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.+)$/);
			if (match) {
				const [, key, value] = match;
				params[key] = value.trim();
			}
		}
		
		return params;
	}

	private async render() {
		this.container.empty()
		const folder: TAbstractFile | null = this.app.vault.getAbstractFileByPath(this.filePath)
		if (folder instanceof TFile) {
			const files = folder.parent?.children ?? []
			const params = this.parseCodeBlockParameters(this.source);
			const renderer = new MarkdownTextRenderer(
				this.plugin, 
				this.app,
				new ExcludePatternManager(this.plugin, params.ignore)
			)
			await MarkdownRenderer.renderMarkdown(renderer.buildMarkdownText(files), this.container, this.filePath, this)
		}
	}
}
