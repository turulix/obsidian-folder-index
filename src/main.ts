import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {IndexContentRenderer} from "./modules/IndexContentRenderer";
import {GraphManipulator} from "./modules/GraphManipulator";
import {EventEmitter} from "events";
import {PluginSettingsTab} from "./models/PluginSettingsTab";

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

export default class FolderIndex extends Plugin {
	settings: PluginSetting;
	graphManipulator: GraphManipulator;
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
		this.graphManipulator = new GraphManipulator(this.app, this)
		this.graphManipulator.load()
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


