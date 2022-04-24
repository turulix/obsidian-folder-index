import {DataEngine} from "../types/DataEngine";
import {App, Notice, TFile, TFolder, WorkspaceLeaf} from "obsidian";
import FolderTableContent, {PluginSetting} from "../main";

type NodeType = "" | "focused" | "tag" | "unresolved" | "attachment"

type GraphNode = {
	links: GraphLink;
	type: NodeType
};

type GraphLink = {
	[id: string]: boolean
}

type Graph = {
	[id: string]: GraphNode
}

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

	getNodeType(file: TFile): NodeType {
		if (app.workspace.getActiveFile() != null && app.workspace.getActiveFile().path == file.path) {
			return "focused"
		}
	}


	buildNodeTree(folder: TFolder) {
		let nodes: Graph = {}

		let indexFile: TFile | null = folder.children.find(value => {
			if (value instanceof TFile) {
				return folder.name == value.basename
			}
			return false
		}) as TFile

		if (folder.isRoot()) {
			indexFile = this.app.vault.getAbstractFileByPath(this.config.rootIndexFile) as TFile
			if (indexFile == null) {
				new Notice(`No Index File found, please create a IndexFile with the name ${this.config.rootIndexFile}`)
				return
			}
		}

		let links: GraphLink = {}

		folder.children.forEach(value => {
			// Find All Files in current Folder and add a Node with No links
			// TODO: Find links for these nodes.
			if (value instanceof TFile) {
				if(indexFile.path != value.path){
					links[value.path] = true
				}

				let fileLinks: GraphLink = {}
				let cache = app.metadataCache.getFileCache(value)
				if (cache.links != null) {
					cache.links.forEach(link => {
						if (this.app.vault.getAbstractFileByPath(link.link + ".md") == null) {
							nodes[link.link + ".md"] = {
								links: {},
								type: "unresolved"
							}
						}
						fileLinks[link.link + ".md"] = true
					})
				}

				nodes[value.path] = {
					links: fileLinks,
					type: this.getNodeType(value)
				}
			}

			// If we find another Folder in this Folder Proceed with getting all Files from that folder
			if (value instanceof TFolder) {
				let result = this.buildNodeTree(value)
				nodes = Object.assign({}, nodes, result.nodes)
			}
		})

		nodes[indexFile.path] = {
			links: links,
			type: this.getNodeType(indexFile)
		}

		return {nodes: nodes, indexFile: indexFile}
	}

	render() {
		let result = this.buildNodeTree(this.app.vault.getRoot())
		let nodes = result.nodes

		this.setAllGraphs({
			nodes: nodes
		})
	}

	setAllGraphs(graphToRender: {}) {
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

		let newLeaves = this.app.workspace.getLeavesOfType("graph")
		if (this.graphsLeafs == null || newLeaves.length != this.graphsLeafs.length) {
			this.graphsLeafs = newLeaves
			app.metadataCache.trigger("ftc:graphLeaveUpdate", this, this.graphsLeafs)
		}
	}


	getEngine(leaf: WorkspaceLeaf): DataEngine {
		// @ts-ignore
		return leaf.view.dataEngine as DataEngine

	}
}
