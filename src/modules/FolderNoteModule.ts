import {App, Notice, TAbstractFile, TFile, TFolder, ViewState} from "obsidian";
import FolderIndexPlugin from "../main";

export class FolderNoteModule {
	viewModeByPlugin = false;
	previous_state: ViewState | null = null;

	constructor(private app: App, private plugin: FolderIndexPlugin) {
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

	private async onClick(event: MouseEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return
		}
		// We only want to handle clicks on the folders in the file explorer
		let target = event.target as HTMLElement
		if (!target.matches(".nav-folder-title, .nav-folder-title-content"))
			return
		// If the user clicked on the content of the folder, we need to get the parent element
		if (target.classList.contains("nav-folder-title-content")) {
			target = event.target.parentElement
		}

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
		const file = this.app.vault.getAbstractFileByPath(path)
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(file)
		}
	}

	private async createIndexFile(path: string) {
		if (this.plugin.settings.autoCreateIndexFile) {
			const name = path.split(/\//).last()
			try {
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

		// Since windows already renamed the folder but Obsidian just hasn't updated yet, we need to change the path manually
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
			if (this.previous_state == null) {
				this.previous_state = this.app.workspace.getLeaf().getViewState()
			}
			if (!this.plugin.settings.autoPreviewMode) {
				return;
			}

			const currentState = this.app.workspace.getLeaf().getViewState()

			// We weren't in a markdown file before, so we don't care
			if (!(currentState.type == "markdown" && this.previous_state.type == "markdown")) {
				return;
			}

			// We didn't change files, so we don't care
			if (currentState.state.file == this.previous_state.state.file)
				return;

			const currentFile = await this.app.vault.getAbstractFileByPath(currentState.state.file) as TFile

			// We did not open an index file, so we need to check if the previous mode was set by this plugin
			if (currentFile.basename != currentFile.parent.name && currentFile.name != this.plugin.settings.rootIndexFile) {
				if (this.viewModeByPlugin) {
					this.viewModeByPlugin = false
					currentState.state.mode = "source"
					await this.app.workspace.getLeaf().setViewState(currentState)
				}
				return;
			}

			// We are already inside the Preview Mode.
			if (this.previous_state.state.mode == "preview") {
				return;
			} else {
				currentState.state.mode = "preview"
				this.viewModeByPlugin = true
				await this.app.workspace.getLeaf().setViewState(currentState)
			}
		} finally {
			const currentState = this.app.workspace.getLeaf().getViewState();
			if (currentState.type == "markdown")
				this.previous_state = currentState;
		}
	}

	private async onCreate(file: TAbstractFile) {
		if (file instanceof TFolder) {
			await this.createIndexFile(`${file.path}/${file.name}.md`)
		}
	}
}
