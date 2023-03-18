import {App, PluginSettingTab, Setting} from "obsidian";
import FolderIndexPlugin from "../main";

export interface PluginSetting {
	graphOverwrite: boolean;
	skipFirstHeadline: boolean;
	disableHeadlines: boolean;
	rootIndexFile: string;
	indexFileInitText: string;
	includeFileContent: boolean,
	autoCreateIndexFile: boolean;
	autoRenameIndexFile: boolean;
	hideIndexFiles: boolean;
	autoPreviewMode: boolean;
	sortIndexFilesAlphabetically: boolean;
	sortHeadersAlphabetically: boolean;
}

export const DEFAULT_SETTINGS: PluginSetting = {
	skipFirstHeadline: true,
	disableHeadlines: false,
	graphOverwrite: false,
	rootIndexFile: "Dashboard.md",
	autoCreateIndexFile: true,
	autoRenameIndexFile: true,
	includeFileContent: false,
	hideIndexFiles: false,
	indexFileInitText: "---\ntags: MOCs\n---\n\n# MOC: {{folder}}\n\n---\n\n```folder-index-content\n```",
	autoPreviewMode: false,
	sortIndexFilesAlphabetically: false,
	sortHeadersAlphabetically: false
}

export class PluginSettingsTab extends PluginSettingTab {
	plugin: FolderIndexPlugin;

	constructor(app: App, plugin: FolderIndexPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Graph Settings'});
		new Setting(containerEl)
			.setName("Overwrite Graph View")
			.setDesc("This will overwrite the default graph view and link files based on their index as well as their normal links")
			.addToggle(component => component.setValue(this.plugin.settings.graphOverwrite)
				.onChange(async (value) => {
					this.plugin.settings.graphOverwrite = value
					await this.plugin.saveSettings()
				}))

		containerEl.createEl('h2', {text: 'Index File Settings'});

		new Setting(containerEl)
			.setName("Root Index File")
			.setDesc("The File that is used for the Root Index File")
			.addText(component => component.setValue(this.plugin.settings.rootIndexFile)
				.setPlaceholder("dashboard.md")
				.onChange(async (value) => {
					this.plugin.settings.rootIndexFile = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Initial Content")
			.setDesc("Set the initial content for new folder indexes.")
			.addTextArea(component => {
				component.setPlaceholder("About the folder.")
					.setValue(this.plugin.settings.indexFileInitText)
					.onChange(async (value) => {
						this.plugin.settings.indexFileInitText = value
						await this.plugin.saveSettings()
					})
				component.inputEl.rows = 8
				component.inputEl.cols = 50
			})

		new Setting(containerEl)
			.setName("Auto create IndexFile")
			.setDesc("This will automatically create an IndexFile when you create a new folder")
			.addToggle(component => component.setValue(this.plugin.settings.autoCreateIndexFile)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateIndexFile = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Auto include preview")
			.setDesc("This will automatically include previews when creating index files (!) ")
			.addToggle((component) => component.setValue(this.plugin.settings.includeFileContent)
				.onChange(async (value) => {
					this.plugin.settings.includeFileContent = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Automatically Rename IndexFile")
			.setDesc("This will automatically rename the folders index file as you rename folders")
			.addToggle(component => component.setValue(this.plugin.settings.autoRenameIndexFile)
				.onChange(async (value) => {
					this.plugin.settings.autoRenameIndexFile = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Hide IndexFile")
			.setDesc("This will hide IndexFiles from the file explorer (Disabled as it causes bugs right now)")
			.addToggle(component => component.setValue(this.plugin.settings.hideIndexFiles)
				.onChange(async (value) => {
					this.plugin.settings.hideIndexFiles = value
					await this.plugin.saveSettings()
				})
				.setDisabled(true)
			)

		containerEl.createEl('h2', {text: 'Content Renderer Settings'});

		new Setting(containerEl)
			.setName("Skip First Headline")
			.setDesc("This will skip the first h1 header to prevent duplicate entries.")
			.addToggle(component => component.setValue(this.plugin.settings.skipFirstHeadline)
				.onChange(async (value) => {
					this.plugin.settings.skipFirstHeadline = value
					await this.plugin.saveSettings()
				}))


		new Setting(containerEl)
			.setName("Disable Headlines")
			.setDesc("This will disable listing headlines within the index file")
			.addToggle(component => component.setValue(this.plugin.settings.disableHeadlines)
				.onChange(async (value) => {
					this.plugin.settings.disableHeadlines = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Automatic Preview mode")
			.setDesc("This will automatically swap to preview mode when opening an index file")
			.addToggle(component => component.setValue(this.plugin.settings.autoPreviewMode)
				.onChange(async (value) => {
					this.plugin.settings.autoPreviewMode = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Sort Indexfiles Alphabetically")
			.setDesc("This will sort the Indexfiles alphabetically")
			.addToggle(component => component.setValue(this.plugin.settings.sortIndexFilesAlphabetically)
				.onChange(async (value) => {
					this.plugin.settings.sortIndexFilesAlphabetically = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Sort Headers Alphabetically")
			.setDesc("This will sort the Headers within a file alphabetically")
			.addToggle(component => component.setValue(this.plugin.settings.sortHeadersAlphabetically)
				.onChange(async (value) => {
					this.plugin.settings.sortHeadersAlphabetically = value
					await this.plugin.saveSettings()
				}))

	}
}
