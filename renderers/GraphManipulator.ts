import {DataEngine} from "../types/DataEngine";
import {App, WorkspaceLeaf} from "obsidian";
import FolderTableContent, {PluginSetting} from "../main";

export class GraphManipulator {
	private graphsLeafs: WorkspaceLeaf[]

	constructor(private app: App, private plugin: FolderTableContent, private config: PluginSetting) {
	}

	load() {
		this.app.workspace.onLayoutReady(this.refreshGraphLeaves.bind(this))
		this.plugin.registerEvent(this.app.workspace.on("layout-change", this.refreshGraphLeaves.bind(this)))

		this.refreshGraphLeaves()
		// @ts-ignore
		this.plugin.registerEvent(
			this.app.metadataCache.on(
				//@ts-ignore
				"ftc:settings",
				(settings: PluginSetting) => {
					console.log("Settings update")
					this.config = settings
					this.refreshGraphLeaves()
				}
			)
		);
	}

	render() {
	}

	overwriteAllGraph(graphToRender: {}) {
		this.clearAllGraphs()
		this.graphsLeafs.forEach(value => {
			this.getEngine(value).renderer.setData(graphToRender)
		})
	}

	clearAllGraphs() {
		this.graphsLeafs.forEach(value => this.getEngine(value).renderer.setData({
			nodes: {}
		}))
	}

	refreshGraphLeaves() {
		console.log("GraphLeaves Update")
		this.graphsLeafs = this.app.workspace.getLeavesOfType("graph")
		app.metadataCache.trigger("ftc:graphLeaveUpdate", this, this.graphsLeafs)
	}


	getEngine(leaf: WorkspaceLeaf): DataEngine {
		// @ts-ignore
		return leaf.view.dataEngine as DataEngine

	}
}
