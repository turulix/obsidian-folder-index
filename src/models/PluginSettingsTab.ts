import {App, PluginSettingTab, Setting} from "obsidian";
import FolderIndex from "../main";

export class PluginSettingsTab extends PluginSettingTab {
	plugin: FolderIndex;

	constructor(app: App, plugin: FolderIndex) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Folder Index Settings'});
		new Setting(containerEl)
			.setName("Overwrite Graph View")
			.setDesc("This will overwrite the default graph view and link files based on their index as well as their normal links")
			.addToggle(component => component.setValue(this.plugin.settings.graphOverwrite)
				.onChange(async (value) => {
					this.plugin.settings.graphOverwrite = value
					await this.plugin.saveSettings()
				}))

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
			.setName("Disable Headlines")
			.setDesc("This will disable listing headlines within the index file")
			.addToggle(component => component.setValue(this.plugin.settings.disableHeadlines)
				.onChange(async (value) => {
					this.plugin.settings.disableHeadlines = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Skip First Headline")
			.setDesc("This will skip the first h1 header to prevent duplicate entries.")
			.addToggle(component => component.setValue(this.plugin.settings.skipFirstHeadline)
				.onChange(async (value) => {
					this.plugin.settings.skipFirstHeadline = value
					await this.plugin.saveSettings()
				}))
	}
}
