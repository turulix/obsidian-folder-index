import {App, PluginSettingTab, Setting, TextAreaComponent} from "obsidian";
import FolderIndexPlugin from "../main";

export interface PluginSetting {
	graphOverwrite: boolean;
	//skipFirstHeadline: boolean;
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
	recursiveIndexFiles: boolean;
	renderFolderBold: boolean;
	renderFolderItalic: boolean;
	useBulletPoints: boolean;
	excludeFolders: string[];
	recursionLimit: number;
	headlineLimit: number;
}

export const DEFAULT_SETTINGS: PluginSetting = {
	//skipFirstHeadline: false,
	disableHeadlines: false,
	graphOverwrite: false,
	rootIndexFile: "Dashboard.md",
	autoCreateIndexFile: true,
	autoRenameIndexFile: true,
	includeFileContent: false,
	hideIndexFiles: false,
	indexFileInitText: "---\ntags: MOCs\n---\n```folder-index-content\n```",
	autoPreviewMode: false,
	sortIndexFilesAlphabetically: true,
	sortHeadersAlphabetically: false,
	recursiveIndexFiles: false,
	renderFolderBold: true,
	renderFolderItalic: false,
	useBulletPoints: false,
	excludeFolders: [],
	recursionLimit: -1,
	headlineLimit: 6,
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

		let textFeld: TextAreaComponent | null = null;
		new Setting(containerEl)
			.setName("Initial Content")
			.setDesc("Set the initial content for new folder indexes.")
			.addButton(component =>
				component.setButtonText("Reset")
					.setWarning()
					.setTooltip("Reset to default")
					.onClick(async () => {
						this.plugin.settings.indexFileInitText = DEFAULT_SETTINGS.indexFileInitText
						textFeld?.setValue(this.plugin.settings.indexFileInitText)
						await this.plugin.saveSettings()
					}
				))
			.addTextArea(component => {
				textFeld = component
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
			.setName("Excluded Folders")
			.setDesc("These Folders will not automatically create an IndexFile")
			.addTextArea(component => {
				component.setPlaceholder("Folder1\nFolder2/Foo\nFolder3/*")
					.setValue(this.plugin.settings.excludeFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludeFolders = value.split("\n")
						await this.plugin.saveSettings()
					})
				component.inputEl.rows = 8
				component.inputEl.cols = 50
			})

		new Setting(containerEl)
			.setName("Automatically generate IndexFile")
			.setDesc("This will automatically create an IndexFile when you create a new folder")
			.addToggle(component => component.setValue(this.plugin.settings.autoCreateIndexFile)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateIndexFile = value
					await this.plugin.saveSettings()
				}))

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

		// new Setting(containerEl)
		// 	.setName("Skip First Headline")
		// 	.setDesc("This Option should not be used anymore, as Obsidian now shows the Filename itself " +
		// 		"Which was often the h1 of a file. " +
		// 		"This will skip the first h1 header to prevent duplicate entries.")
		// 	.addToggle(component => component.setValue(this.plugin.settings.skipFirstHeadline)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.skipFirstHeadline = value
		// 			await this.plugin.saveSettings()
		// 		}))

		new Setting(containerEl)
			.setName("Auto include preview")
			.setDesc("This will automatically include previews when creating index files (!) ")
			.addToggle((component) => component.setValue(this.plugin.settings.includeFileContent)
				.onChange(async (value) => {
					this.plugin.settings.includeFileContent = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Disable Headlines")
			.setDesc("This will disable listing headlines within the index file")
			.addToggle(component => component.setValue(this.plugin.settings.disableHeadlines)
				.onChange(async (value) => {
					this.plugin.settings.disableHeadlines = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Headline Limit")
			.setDesc("Limit the Depth of Headlines Displayed")
			.addText(component => component.setValue(this.plugin.settings.headlineLimit.toString())
				.setPlaceholder("6")
				.onChange(async (value) => {
					let numValue: number = Number.parseInt(value)

					if (!isNaN(numValue)) {
						if (numValue < 0) {
							numValue = 0
						}
						else if (numValue > 6) {
							numValue = 6
						}
					} else {
						numValue = 6
					}
					this.plugin.settings.headlineLimit = numValue
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
			.setName("Sort Files Alphabetically")
			.setDesc("This will sort the Files alphabetically")
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

		new Setting(containerEl)
			.setName("Build IndexFiles Recursively")
			.setDesc("This will show all files within a folder and its subfolders")
			.addToggle(component => component.setValue(this.plugin.settings.recursiveIndexFiles)
				.onChange(async (value) => {
					this.plugin.settings.recursiveIndexFiles = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Subfolder Limit")
			.setDesc("Limit the Depth of Subfolders(-1 for no limit)")
			.addText(component => component.setValue(this.plugin.settings.recursionLimit.toString())
				.setPlaceholder("-1")
				.onChange(async (value) => {
					let numValue: number = Number.parseInt(value)
					if (isNaN(numValue) || numValue < 0) {
						numValue = -1
					}
					this.plugin.settings.recursionLimit = numValue
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Render Folders Bold")
			.setDesc("This will render folders in **bold**")
			.addToggle(component => component.setValue(this.plugin.settings.renderFolderBold)
				.onChange(async (value) => {
					this.plugin.settings.renderFolderBold = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Render Folder Italic")
			.setDesc("This will render folders in *italic*")
			.addToggle(component => component.setValue(this.plugin.settings.renderFolderItalic)
				.onChange(async (value) => {
					this.plugin.settings.renderFolderItalic = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Use bullet-points instead of list")
			.setDesc("This will render the index file as a bullet-point list instead of a numbered list")
			.addToggle(component => component.setValue(this.plugin.settings.useBulletPoints)
				.onChange(async (value) => {
					this.plugin.settings.useBulletPoints = value
					await this.plugin.saveSettings()
				}))

	}
}
