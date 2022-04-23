import {
	App,
	Plugin,
	PluginSettingTab,
	Setting, TFile, TFolder, WorkspaceLeaf
} from 'obsidian';
import {CodeBlockRenderer} from "./renderers/CodeBlockRenderer";
import {DataEngine} from "./types/DataEngine";
import {GraphManipulator} from "./renderers/GraphManipulator";

// Remember to rename these classes and interfaces!

export interface PluginSetting {
	graphOverwrite: boolean;
	skipFirstHeadline: boolean;
	disableHeadlines: boolean;
}

const DEFAULT_SETTINGS: PluginSetting = {
	skipFirstHeadline: true,
	disableHeadlines: false,
	graphOverwrite: true
}

export default class FolderTableContent extends Plugin {
	settings: PluginSetting;
	graphManipulator: GraphManipulator;

	async onload() {
		console.log("Loading FolderTableContent")
		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("ftc", (source, el, ctx) => {
			ctx.addChild(new CodeBlockRenderer(this.app, ctx.sourcePath, el, this.settings))
		})
		this.graphManipulator = new GraphManipulator(this.app, this, this.settings)
		this.graphManipulator.load()


		// @ts-ignore
		this.app.metadataCache.on("ftc:graphLeaveUpdate", (manipulator: GraphManipulator, leaves: WorkspaceLeaf[]) => {
			this.onGraphWindowUpdate(manipulator, leaves)
		})


		this.addCommand({
			id: "execute-test-command",
			name: "Test Command",
			callback: () => {
				this.graphManipulator.overwriteAllGraph({})
			}
		})
	}

	async onunload() {

	}

	onGraphWindowUpdate(manipulator: GraphManipulator, leaves: WorkspaceLeaf[]) {
		leaves.forEach(value => {
			let engine = manipulator.getEngine(value)
			if (engine.oldRender == null) {
				engine.oldRender = engine.render
				engine.render = () => {
					if (this.settings.graphOverwrite) {
						console.log("New Render Method")
						manipulator.render()
					} else {
						// Idk why, but you have to call this twice for it to work?!?!
						engine.oldRender()
						engine.oldRender()
					}
				}
			}
			engine.render()
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.app.metadataCache.trigger("ftc:settings", this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: FolderTableContent;

	constructor(app: App, plugin: FolderTableContent) {
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
