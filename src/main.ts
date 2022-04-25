import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {ContentRenderer} from "./modules/ContentRenderer";
import {GraphManipulator} from "./modules/GraphManipulator";
import {EventEmitter} from "events";

// Remember to rename these classes and interfaces!

export interface PluginSetting {
	graphOverwrite: boolean;
	skipFirstHeadline: boolean;
	disableHeadlines: boolean;
	rootIndexFile: string
}

const DEFAULT_SETTINGS: PluginSetting = {
	skipFirstHeadline: true,
	disableHeadlines: false,
	graphOverwrite: true,
	rootIndexFile: "Dashboard.md"
}

export default class FolderIndex extends Plugin{
	settings: PluginSetting;
	graphManipulator: GraphManipulator;
	eventManager: EventEmitter

	async onload() {
		console.log("Loading FolderTableContent")
		console.log("Test")
		this.eventManager = new EventEmitter()

		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this))
		this.registerEvent(this.app.workspace.on("layout-change", this.onLayoutChange.bind(this)))

		this.registerMarkdownCodeBlockProcessor("ftc", (source, el, ctx) => {
			ctx.addChild(new ContentRenderer(this.app, this, ctx.sourcePath, el))
		})
		this.graphManipulator = new GraphManipulator(this.app, this)
		this.graphManipulator.load()
	}

	onLayoutChange(){
		this.eventManager.emit("onLayoutChange")
	}
	onLayoutReady(){
		this.eventManager.emit("onLayoutReady")
	}

	async onunload() {
		console.log("Unloading FolderTableContent")
		this.eventManager.removeAllListeners()
		this.graphManipulator.unload()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		console.log("Save Settings");
		await this.saveData(this.settings);
		this.eventManager.emit("settingsUpdate", this.settings);
	}

	sendNotice(message: string): void {
		new Notice(message)
		console.log(message)
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: FolderIndex;

	constructor(app: App, plugin: FolderIndex) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Folder Content Table Settings'});
		new Setting(containerEl)
			.setName("Overwrite Graph View")
			.setDesc("This will overwrite the default graph view and fixing linked files not actually being linked")
			.addToggle(component => component.setValue(this.plugin.settings.graphOverwrite)
				.onChange(async (value) => {
					this.plugin.settings.graphOverwrite = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Root Index File")
			.setDesc("This will overwrite the default graph view and fixing linked files not actually being linked")
			.addText(component => component.setValue(this.plugin.settings.rootIndexFile)
				.setPlaceholder("dashboard.md")
				.onChange(async (value) => {
					this.plugin.settings.rootIndexFile = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName("Disable Headlines")
			.setDesc("This will disable listing headlines within the table")
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
