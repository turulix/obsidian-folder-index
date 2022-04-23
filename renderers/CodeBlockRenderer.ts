import {
	App,
	MarkdownPreviewRenderer,
	MarkdownRenderChild,
	MarkdownRenderer,
	TAbstractFile,
	TFile,
	TFolder
} from "obsidian";
import {PluginSetting} from "../main";
import {FileHeader} from "../models/FileHeader";

export class CodeBlockRenderer extends MarkdownRenderChild {
	private config: PluginSetting;

	constructor(private app: App, private filePath: string, private container: HTMLElement, config: PluginSetting) {
		super(container)
		this.config = config;
	}


	async onload() {
		await this.render()
		this.registerEvent(
			this.app.metadataCache.on(
				//@ts-ignore
				"ftc:settings",
				(settings: PluginSetting) => {
					this.config = settings
					this.render()
				}
			)
		);
	}

	private async render() {
		this.container.empty()
		let parent: TFolder = app.vault.getAbstractFileByPath(this.filePath).parent
		let files = parent.children
		await MarkdownRenderer.renderMarkdown(this.buildMarkdownText(files), this.container, this.filePath, this)
	}

	private buildMarkdownText(filtered_files: TAbstractFile[]): string {
		const list: string[] = []

		filtered_files.forEach(value => {
			if (value instanceof TFile) {
				if (value.basename == value.parent.name) {
					return
				}
				let headings = app.metadataCache.getFileCache(value).headings
				let fileLink = app.metadataCache.fileToLinktext(value, this.filePath)
				list.push(`1. [[${fileLink}]]`)
				if (headings != null && !this.config.disableHeadlines) {
					for (let i = this.config.skipFirstHeadline ? 1 : 0; i < headings.length; i++) {
						let heading = new FileHeader(headings[i])
						let numIndents = new Array(Math.max(1, heading.level - headings[0].level));

						const indent = numIndents.fill("\t").join("");
						list.push(`${indent}1. [[${fileLink}#${heading.rawHeading}|${heading.rawHeading}]]`);
					}
				}
			}

		})

		return list.join("\n")
	}
}
