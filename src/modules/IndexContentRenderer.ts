import {App, MarkdownRenderChild, MarkdownRenderer, TAbstractFile, TFile, TFolder} from "obsidian";
import FolderIndexPlugin from "../main";
import {FileHeader} from "../models/FileHeader";
import {PluginSetting} from "../models/PluginSettingsTab";

export class IndexContentRenderer extends MarkdownRenderChild {
	constructor(private app: App, private plugin: FolderIndexPlugin, private filePath: string, private container: HTMLElement) {
		super(container)
	}

	async onload() {
		await this.render()
		this.plugin.eventManager.on("settingsUpdate", this.onSettingsUpdate.bind(this));
	}


	async onunload() {
		this.plugin.eventManager.off("settingsUpdate", this.onSettingsUpdate.bind(this))
	}

	public onSettingsUpdate(_settings: PluginSetting) {
		this.render().then()
	}

	private async render() {
		this.container.empty()
		const parent: TFolder = this.app.vault.getAbstractFileByPath(this.filePath).parent
		const files = parent.children
		await MarkdownRenderer.renderMarkdown(this.buildMarkdownText(files), this.container, this.filePath, this)
	}

	private buildMarkdownText(filtered_files: TAbstractFile[]): string {
		const list: string[] = []

		if (this.plugin.settings.sortIndexFilesAlphabetically) {
			filtered_files = filtered_files.sort((a, b) => a.name.localeCompare(b.name))
		}

		filtered_files.forEach(value => {
			if (value instanceof TFile) {
				if (value.basename == value.parent.name) {
					return
				}


				let headings = this.app.metadataCache.getFileCache(value).headings
				const fileLink = this.app.metadataCache.fileToLinktext(value, this.filePath)
				list.push(`1. ${this.plugin.settings.includeFileContent ? '!' : ''}[[${fileLink}|${value.basename}]]`);

				if (headings != null && !this.plugin.settings.disableHeadlines) {
					headings = headings.sort((a, b) => a.position.start.offset - b.position.start.offset)
					if (this.plugin.settings.skipFirstHeadline) {
						headings = headings.slice(1)
					}
					if (this.plugin.settings.sortHeadersAlphabetically) {
						headings = headings.sort((a, b) => a.heading.localeCompare(b.heading))
					}
					for (let i = 0; i < headings.length; i++) {
						const heading = new FileHeader(headings[i])
						//const numIndents = new Array(Math.max(1, heading.level - headings[0].level + (this.plugin.settings.skipFirstHeadline ? 1 : 0)));
						let indent = ""
						for (let j = 0; j < heading.level; j++) {
							indent += "\t"
						}
						//const indent = numIndents.fill("\t").join("");
						list.push(`${indent}1. [[${fileLink}#${heading.rawHeading}|${heading.rawHeading}]]`);
					}
				}
			}

		})

		return list.join("\n")
	}
}
