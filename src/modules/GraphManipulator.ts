import {DataEngine} from "../types/DataEngine";
import {App, TFile, TFolder, WorkspaceLeaf} from "obsidian";
import FolderIndex from "../main";

type NodeType = "" | "focused" | "tag" | "unresolved" | "attachment"

type GraphNode = {
	links: GraphLink;
	type: NodeType,
	color?: {
		a: number
		rgb: number
	}
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
			const engine = this.getEngine(value)
			// Check if we have a new graph leaf
			if (engine.oldRender == null) {
				// Safe the old render method
				engine.oldRender = engine.render

				// Overwrite with our render method.
				engine.render = () => {
					if (this.plugin.settings.graphOverwrite) {
						this.render(engine)
					} else {
						engine.oldRender()
					}
				}
				// We may need to rerender the graph view, so we do this here.
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
			const engine = this.getEngine(value)
			if (engine.oldRender != null) {
				engine.render = engine.oldRender
				delete engine.oldRender
				this.clearGraph(engine)
				engine.render()
			}
		})
	}

	render(engine: DataEngine) {
		const renderSettings = engine.getOptions()
		const graph: Graph = {}

		this.app.vault.getFiles().forEach(async file => {
			if (Object.keys(engine.fileFilter).length > 0 && !engine.fileFilter[file.path]) {
				return;
			}
			const edges: GraphLink = {}
			const cache = this.app.metadataCache.getFileCache(file)

			if (file.parent.name + ".md" == file.name || file.name == this.plugin.settings.rootIndexFile) {
				file.parent.children.forEach(otherFile => {
					if (otherFile instanceof TFile && file.path != otherFile.path) {
						// Other File will add itself
						edges[otherFile.path] = true
					}
					if (otherFile instanceof TFolder) {
						// Look if it has an index File
						const subIndex = otherFile.children.find(value => value.name == otherFile.name + ".md")
						if (subIndex != null) {
							edges[subIndex.path] = true
						}
					}
				})
			}

			if (cache.links != null) {
				cache.links.forEach(link => {
					if(link.link.contains("#")){
						link.link = link.link.split(/#/)[0]
					}
					const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path)
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
					const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path)
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
			for (const graphKey in graph) {
				if (Object.keys(graph[graphKey]["links"]).length > 0) {
					allLinks.push(graphKey)
				}
				allLinks = allLinks.concat(Object.keys(graph[graphKey]["links"]))
			}
			for (const graphKey in graph) {
				if (!allLinks.includes(graphKey)) {
					delete graph[graphKey]
				}
			}
		}

		//Fix Colors
		// IDK how it works, but I reverse engineered it out of the Application, and it does ¯\_(ツ)_/¯
		// NOT LIKE I SPEND LITERALLY 28h LOOKING AT COMPILED TS CODE TO FIGURE OUT HOW TO CONTROL THIS GRAPH BUT FINE
		// NOT EVEN THE FILTER STUFF IS EXPOSED IN THIS API REEEEEEEEEEEEEEEEEEEEEEEEEEEE
		function AddColorTag(filePath: string, nodeType: string) {
			const searchQueries = engine.searchQueries
			const engineOptions = engine.options
			const fileFilter = engine.fileFilter
			return !searchQueries || ("" === nodeType ? filePath === engineOptions.localFile || (fileFilter.hasOwnProperty(filePath) ? fileFilter[filePath] : !engine.hasFilter) : "tag" === nodeType ? searchQueries.every((function (e: any) {
					return !!e.color || !!e.query.matchTag(filePath)
				}
			)) : "attachment" !== nodeType || searchQueries.every((function (e: any) {
					return !!e.color || !!e.query.matchFilepath(filePath)
				}
			)))
		}

		// Just looping over all the nodes in the graph and adding the color tag when necessary
		for (const graphKey in graph) {
			const returnValue = AddColorTag(graphKey, graph[graphKey].type)
			if (returnValue === true)
				continue
			graph[graphKey].color = returnValue
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
