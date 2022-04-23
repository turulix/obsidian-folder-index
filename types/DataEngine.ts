import {App, View} from "obsidian";

export interface DataEngine {
	oldRender: Function | null;
	app: App
	renderer: Renderer
	view: View
	options: {}
	getOptions: Function
	load: Function
	onCssChange: Function
	onFileChange: Function
	onFileOpen: Function
	onNodeClick: Function
	onNodeHover: Function
	onNodeRightClick: Function
	onNodeUnhover: Function
	recomputeFile: Function
	render: Function
	renderProgression: Function
	setOptions: Function
	setQuery: Function
	updateSearch: Function
	onOptionsChange: Function

}

export interface Renderer{
	links: []
	nodes: []
	changed: Function
	destroy: Function
	destroyGraphics: Function
	getBackgroundScreenshot: Function
	getHighlightNode: Function
	getNodeFromGraphics: Function
	getTransparentScreenshot: Function
	initGraphics: Function
	worker: Worker
	setData: Function
}

