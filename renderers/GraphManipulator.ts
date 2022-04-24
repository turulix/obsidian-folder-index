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
		this.app.workspace.onLayoutReady(this.onLayoutChange.bind(this))
		this.plugin.registerEvent(this.app.workspace.on("layout-change", this.onLayoutChange.bind(this)))

		// @ts-ignore
		this.app.metadataCache.on("ftc:graphLeaveUpdate", (manipulator: GraphManipulator, leaves: WorkspaceLeaf[]) => {
			leaves.forEach(value => {
				let engine = manipulator.getEngine(value)
				if (engine.oldRender == null) {
					engine.oldRender = engine.render
					if (this.config.graphOverwrite) {
						GraphManipulator.clearGraph(engine)
					}
					engine.render = () => {
						if (this.config.graphOverwrite) {
							manipulator.render(engine)
						} else {
							engine.oldRender()
						}
					}
				}
			})
		})

		this.onLayoutChange()
		// @ts-ignore
		this.plugin.registerEvent(
			this.app.metadataCache.on(
				//@ts-ignore
				"ftc:settings",
				(settings: PluginSetting) => {
					console.log("Settings update")
					this.config = settings
					this.redrawAllGraphs()
				}
			)
		);
	}

	render(engine: DataEngine) {
		let renderSettings = engine.getOptions()
		let graph: Graph = {}
		this.app.vault.getFiles().forEach(file => {
			let edges: GraphLink = {}
			let cache = this.app.metadataCache.getFileCache(file)

			if (file.parent.name + ".md" == file.name || file.name == this.config.rootIndexFile) {
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
				if(Object.keys(graph[graphKey]["links"]).length > 0){
					allLinks.push(graphKey)
				}
				allLinks = allLinks.concat(Object.keys(graph[graphKey]["links"]))
			}
			for (let graphKey in graph) {
				if(!allLinks.includes(graphKey)){
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

	onLayoutChange() {
		console.log("GraphLeaves Update")
		this.graphsLeafs = this.app.workspace.getLeavesOfType("graph")
		app.metadataCache.trigger("ftc:graphLeaveUpdate", this, this.graphsLeafs)
	}


	getEngine(leaf: WorkspaceLeaf): DataEngine {
		// @ts-ignore
		return leaf.view.dataEngine as DataEngine

	}

	private static clearGraph(engine: DataEngine) {
		engine.renderer.setData({
			nodes: {}
		})
	}
}
