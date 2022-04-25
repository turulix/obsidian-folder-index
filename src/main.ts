import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {IndexContentRenderer} from "./modules/IndexContentRenderer";
import {GraphManipulatorModule} from "./modules/GraphManipulatorModule";
import {EventEmitter} from "events";
import {DEFAULT_SETTINGS, PluginSetting, PluginSettingsTab} from "./models/PluginSettingsTab";
import {FolderNoteModule} from "./modules/FolderNoteModule";

// Remember to rename these classes and interfaces!



export default class FolderIndexPlugin extends Plugin {
	settings: PluginSetting;
	graphManipulator: GraphManipulatorModule;
	folderNodeModule: FolderNoteModule;
	eventManager: EventEmitter

	async onload() {
		console.log("Loading FolderTableContent")
		this.eventManager = new EventEmitter()


		await this.loadSettings();

		this.addSettingTab(new PluginSettingsTab(this.app, this));

		this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this))
		this.registerEvent(this.app.workspace.on("layout-change", this.onLayoutChange.bind(this)))

		this.registerMarkdownCodeBlockProcessor("folder-index-content", (source, el, ctx) => {
			ctx.addChild(new IndexContentRenderer(this.app, this, ctx.sourcePath, el))
		})

		this.folderNodeModule = new FolderNoteModule(this.app, this)
		this.graphManipulator = new GraphManipulatorModule(this.app, this)
	}

	onLayoutChange() {
		this.eventManager.emit("onLayoutChange")
	}

	onLayoutReady() {
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
		await this.saveData(this.settings);
		this.eventManager.emit("settingsUpdate", this.settings);
	}
}


