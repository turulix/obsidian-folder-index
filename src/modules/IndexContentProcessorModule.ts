import {App, MarkdownRenderChild, MarkdownRenderer, TAbstractFile, TFile} from "obsidian";
import FolderIndexPlugin from "../main";
import {MarkdownTextRenderer} from "../types/MarkdownTextRenderer";
import {CodeBlockConfig} from "../models/CodeBlockConfig";

export class IndexContentProcessorModule extends MarkdownRenderChild {
	private codeBlockContent: string;

	constructor(
		private readonly app: App,
		private readonly plugin: FolderIndexPlugin,
		private readonly filePath: string,
		private readonly container: HTMLElement,
		source: string
	) {
		super(container)
		this.app = app
		this.plugin = plugin
		this.filePath = filePath
		this.container = container
		this.codeBlockContent = source
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
			const codeBlockConfig = this.parseCodeBlockConfig()
			await MarkdownRenderer.renderMarkdown(renderer.buildMarkdownText(files, codeBlockConfig), this.container, this.filePath, this)
		}
	}

	private parseCodeBlockConfig(): CodeBlockConfig {
		const config: CodeBlockConfig = { ignore: [] }
		
		// Parse each line of the code block content
		const lines = this.codeBlockContent.split("\n")
		
		for (const line of lines) {
			const parts = line.split(":");
			
			if (parts.length >= 2) {
				const [key, ...valueParts] = parts;
				const value = valueParts.join(":").trim();
				const trimmedKey = key.trim();
				
				if (trimmedKey === "ignore") {
					// Split by comma and trim each pattern
					config.ignore = value.split(",").map(s => s.trim());
				}
			}
		}
		
		return config
	}
}
