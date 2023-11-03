import {App, Notice, TAbstractFile, TFile, TFolder, ViewState} from "obsidian";
import FolderIndexPlugin from "../main";
import {isExcludedPath, isIndexFile} from "../types/Utilities";

export class FolderNoteModule {
	viewModeByPlugin = false;
	previousState: ViewState | null = null;

	constructor(private app: App, private plugin: FolderIndexPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.load()
	}

	load() {
		// Apparently loading the vault also triggers the create event. So we just wait till everything is ready
		this.app.workspace.onLayoutReady(() => {
			this.plugin.registerEvent(this.app.vault.on("create", this.onCreate.bind(this)))
		})

		this.plugin.registerEvent(this.app.workspace.on("layout-change", this.onLayoutChange.bind(this)))

		this.plugin.registerDomEvent(document, "click", this.onClick.bind(this))
		this.plugin.registerEvent(this.app.vault.on("rename", this.onRename.bind(this)))
	}

	unload() {
		// this.plugin.eventManager.off("fileExplorerFolderClick", this.onFolderClick.bind(this))
		// FolderNoteModule.showAllIndexFiles()
	}


	private getTargetFromEvent(event: MouseEvent): HTMLElement | null {
		if (!(event.target instanceof HTMLElement)) {
			return null
		}
		const target = event.target
		// @ts-ignore - This is a hack to get the active plugins.
		// noinspection JSUnresolvedReference
		const activePlugins: Set = this.app.plugins.enabledPlugins

		// Compatibility with https://github.com/ozntel/file-tree-alternative
		if (activePlugins.has("file-tree-alternative")) {
			if (target.classList.contains("oz-folder-name")) {
				return (target.parentElement?.parentElement?.parentElement) ?? null
			}
			if (target.classList.contains("oz-folder-block")) {
				return (target.parentElement?.parentElement) ?? null
			}
		}

		// We only want to handle clicks on the folders in the file explorer
		if (target.classList.contains("nav-folder-title"))
			return target
		// If the user clicked on the content of the folder, we need to get the parent element
		if (target.classList.contains("nav-folder-title-content")) {
			return target.parentElement
		}
		return null
	}

	private async onClick(event: MouseEvent) {
		const target = this.getTargetFromEvent(event)
		if (target == null)
			return

		// Get the path of the clicked folder
		const dataPathAttribute = target.attributes.getNamedItem("data-path")
		let dataPath: string
		if (dataPathAttribute == null) {
			return
		} else {
			dataPath = dataPathAttribute.value
		}

		const folderName = dataPath.split("/").pop()
		let indexFilePath = dataPath + "/" + folderName + ".md"

		// This is the root folder, so we open the root index file
		if (indexFilePath == "//.md") {
			indexFilePath = this.plugin.settings.rootIndexFile
		}

		// Create the File if it doesn't exist and open it
		if (!this.doesFileExist(indexFilePath)) {
			if (await this.createIndexFile(indexFilePath)) {
				await this.openIndexFile(indexFilePath)
			}
		} else {
			await this.openIndexFile(indexFilePath)
		}
	}

	private doesFileExist(path: string) {
		return this.app.vault.getAbstractFileByPath(path) != null
	}

	private async openIndexFile(path: string) {
		if (!isIndexFile(path)) {
			return
		}

		const file = this.app.vault.getAbstractFileByPath(path)
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(file)
		}
	}

	private async createIndexFile(path: string) {
		if (isExcludedPath(path))
			return false
		if (this.plugin.settings.autoCreateIndexFile) {
			const name = path.split(/\//).last()
			try {
				if (!name)
					return false
				const file = await this.app.vault.create(path, this.plugin.settings.indexFileInitText.replace("{{folder}}", name))
				new Notice(`Created index file ${file.basename}`)
				return true
			} catch (e) {
				new Notice(`Failed to create index file ${name}`)
			}
		}
		return false
	}

	private async onRename(file: TAbstractFile, oldPath: string) {

		if (!this.plugin.settings.autoRenameIndexFile) {
			return
		}
		// We don't care if a file was renamed.
		if (file instanceof TFile) {
			return
		}
		// The File is a folder within the renamed Folder, so we don't care.
		if (oldPath.split("/").pop() == file.name) {
			return;
		}

		const oldIndexFileName = oldPath.split("/").pop()

		// The Folder didn't contain an index file, so we don't care.
		// Obsidian is slow, so this still the Path at this time.
		if (!this.doesFileExist(`${oldPath}/${oldIndexFileName}.md`))
			return

		// The Folder contained an index file, so we need to rename it.

		const oldIndexFile = this.app.vault.getAbstractFileByPath(`${oldPath}/${oldIndexFileName}.md`) as TFile
		if (!isIndexFile(oldIndexFile.path))
			return

		// Since the OS already renamed the folder but Obsidian just hasn't updated yet, we need to change the path manually
		oldIndexFile.path = `${file.path}/${oldIndexFileName}.md`


		try {
			await this.app.vault.rename(oldIndexFile, `${file.path}/${file.name}.md`)
			new Notice(`Renamed index file ${oldIndexFileName} to ${file.name}`)
		} catch (e) {
			new Notice(`Failed to rename index file ${oldIndexFileName} to ${file.name}. ${file.name} will be used as the index file.`)
		}


	}

	private async onLayoutChange() {
		try {
			if (this.previousState == null) {
				this.previousState = this.app.workspace.getLeaf().getViewState()
			}
			if (!this.plugin.settings.autoPreviewMode) {
				return;
			}

			const currentState = this.app.workspace.getLeaf().getViewState()

			// We weren't in a markdown file before, so we don't care
			if (!(currentState.type == "markdown" && this.previousState.type == "markdown")) {
				return;
			}

			// We didn't change files, so we don't care
			if (currentState.state.file == this.previousState.state.file)
				return;

			const currentFile = this.app.vault.getAbstractFileByPath(currentState.state.file) as TFile

			// We did not open an index file, so we need to check if the previous mode was set by this plugin
			if (!isIndexFile(currentFile.path)) {
				if (this.viewModeByPlugin) {
					this.viewModeByPlugin = false
					currentState.state.mode = "source"
					await this.app.workspace.getLeaf().setViewState(currentState)
				}
				return;
			}

			// We are already inside the Preview Mode.
			if (this.previousState.state.mode == "preview") {
				return;
			} else {
				currentState.state.mode = "preview"
				this.viewModeByPlugin = true
				await this.app.workspace.getLeaf().setViewState(currentState)
			}
		} finally {
			const currentState = this.app.workspace.getLeaf().getViewState();
			if (currentState.type == "markdown")
				this.previousState = currentState;
		}
	}

	private async onCreate(file: TAbstractFile) {
		if (file instanceof TFolder) {
			await this.createIndexFile(`${file.path}/${file.name}.md`)
		}
	}
}
