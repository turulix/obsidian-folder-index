import {DataEngine} from "../types/DataEngine";
import {App, Notice, prepareQuery, TFile, TFolder, WorkspaceLeaf, FuzzyMatch} from "obsidian";
import FolderIndex, {PluginSetting} from "../main";

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
	private oldGraphOverwrite: boolean

	constructor(private app: App, private plugin: FolderIndex) {
	}

	private onLayoutChange() {
		this.graphsLeafs = this.app.workspace.getLeavesOfType("graph")
		this.plugin.eventManager.emit("graphLeafUpdate", this.graphsLeafs)
	}

	private onLeafUpdate(leaves: WorkspaceLeaf[]) {
		leaves.forEach(value => {
			let engine = this.getEngine(value)
			if (engine.oldRender == null) {
				engine.oldRender = engine.render
				engine.render = () => {
					if (this.plugin.settings.graphOverwrite) {
						this.render(engine)
					} else {
						engine.oldRender()
					}
				}
				if (this.plugin.settings.graphOverwrite) {
					this.clearGraph(engine)
					this.render(engine)
				}
			}
		})
	}

	private onSettingsUpdate() {
		if (this.oldGraphOverwrite != this.plugin.settings.graphOverwrite) {
			this.redrawAllGraphs()
			this.oldGraphOverwrite = this.plugin.settings.graphOverwrite
		}
	}

	load() {
		this.oldGraphOverwrite = this.plugin.settings.graphOverwrite;

		this.plugin.eventManager.on("onLayoutChange", this.onLayoutChange.bind(this))
		this.plugin.eventManager.on("graphLeafUpdate", this.onLeafUpdate.bind(this))
		this.plugin.eventManager.on("settingsUpdate", this.onSettingsUpdate.bind(this))

		this.onLayoutChange()

		if (this.plugin.settings.graphOverwrite) {
			this.clearAllGraphs()
			this.redrawAllGraphs()
		}
	}

	unload() {
		this.graphsLeafs.forEach(value => {
			let engine = this.getEngine(value)
			if (engine.oldRender != null) {
				engine.render = engine.oldRender
				delete engine.oldRender
				this.clearGraph(engine)
				engine.render()
			}
		})
	}

	render(engine: DataEngine) {
		let renderSettings = engine.getOptions()
		let graph: Graph = {}
		debugger;

		this.app.vault.getFiles().forEach(async file => {
			if(Object.keys(engine.fileFilter).length > 0 &&!engine.fileFilter[file.path] ){
				return;
			}
			let edges: GraphLink = {}
			let cache = this.app.metadataCache.getFileCache(file)

			if (file.parent.name + ".md" == file.name || file.name == this.plugin.settings.rootIndexFile) {
				file.parent.children.forEach(otherFile => {
					if (otherFile instanceof TFile && file.path != otherFile.path) {
						// Other File will add itself
						edges[otherFile.path] = true
					}
					if (otherFile instanceof TFolder) {
						// Look if it has an index File
						let subIndex = otherFile.children.find(value => value.name == otherFile.name + ".md")
						if (subIndex != null) {
							edges[subIndex.path] = true
						}
					}
				})
			}

			if (cache.links != null) {
				cache.links.forEach(link => {
					let linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path)
					if (linkedFile == null) {
						//The linked file doesn't exist. So it's an unresolved link
						edges[link.link] = true
						if (!renderSettings.hideUnresolved) {
							graph[link.link] = {
								links: {},
								type: "unresolved"
							}
						}
					} else {
						//The Linked file exists, so we link to it and don't add it
						// because it will add itself later.
						edges[linkedFile.path] = true
					}
				})
			}
			if (cache.tags != null && renderSettings.showTags == true) {
				cache.tags.forEach(tag => {
					// We have to add it, it will not add itself.
					graph[tag.tag] = {
						links: {},
						type: "tag"
					}
					edges[tag.tag] = true
				})
			}
			if (cache.embeds != null) {
				cache.embeds.forEach(embed => {
					let linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path)
					if (linkedFile == null) {
						//The linked file doesn't exist. So it's an unresolved link
						edges[embed.link] = true
						graph[embed.link] = {
							links: {},
							type: "unresolved"
						}
					} else {
						//The Linked file exists, so we link to it and don't add it
						// because it will add itself later.
						edges[linkedFile.path] = true
					}
				})
			}

			let type: NodeType = ""
			if (this.app.workspace.getActiveFile() != null && this.app.workspace.getActiveFile().path == file.path) {
				type = "focused"
			} else if (file.extension != "md") {
				type = "attachment"
			}
			if (type == "attachment" && !renderSettings.showAttachments) {
				return
			}
			graph[file.path] = {
				links: edges,
				type: type
			}

		})

		if (!renderSettings.showOrphans) {
			let allLinks: string[] = []
			for (let graphKey in graph) {
				if (Object.keys(graph[graphKey]["links"]).length > 0) {
					allLinks.push(graphKey)
				}
				allLinks = allLinks.concat(Object.keys(graph[graphKey]["links"]))
			}
			for (let graphKey in graph) {
				if (!allLinks.includes(graphKey)) {
					delete graph[graphKey]
				}
			}
		}

		engine.renderer.setData({
			nodes: graph
		})

	}

	redrawAllGraphs() {
		this.clearAllGraphs()
		this.graphsLeafs.forEach(value => this.getEngine(value).render())
	}

	clearAllGraphs() {
		this.graphsLeafs.forEach(value => this.getEngine(value).renderer.setData({
			nodes: {}
		}))
	}

	getEngine(leaf: WorkspaceLeaf): DataEngine {
		// @ts-ignore
		return leaf.view.dataEngine as DataEngine

	}

	clearGraph(engine: DataEngine) {
		engine.renderer.setData({
			nodes: {}
		})
	}
}
