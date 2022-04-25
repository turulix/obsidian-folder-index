import {App, Notice, TAbstractFile, TFile, TFolder} from "obsidian";
import FolderIndexPlugin from "../main";
import {PluginSetting} from "../models/PluginSettingsTab";


// This one is inspired by xpgo's FolderNote
// https://github.com/xpgo/obsidian-folder-note-plugin
export class FolderNoteModule {
	constructor(private app: App, private plugin: FolderIndexPlugin) {
		this.load()
	}

	load() {
		// Apparently loading the vault also triggers the create event. So we just wait till everything is ready
		this.app.workspace.onLayoutReady(() => {
			this.plugin.registerEvent(this.app.vault.on("create", this.onFileCreate.bind(this)))
		})

		this.plugin.registerEvent(this.app.vault.on("rename", this.onFileRename.bind(this)))
		this.plugin.eventManager.on("fileExplorerFolderClick", this.onFolderClick.bind(this))
		this.plugin.eventManager.on("settingsUpdate", this.onSettingsUpdate.bind(this))

		this.plugin.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			let folderPath = '';
			let folderName = '';

			const elemTarget = (evt.target as Element)
			let folderElem = elemTarget;

			const className = elemTarget.className.toString();
			if (className.contains('nav-folder-title-content')) {
				folderName = folderElem.getText();
				folderElem = elemTarget.parentElement;
				folderPath = folderElem.attributes.getNamedItem('data-path').textContent;
				this.plugin.eventManager.emit("fileExplorerFolderClick", elemTarget, folderPath, folderName)
			} else if (className.contains('nav-folder-title')) {
				folderPath = elemTarget.attributes.getNamedItem('data-path').textContent;
				folderName = elemTarget.lastElementChild.getText();
				this.plugin.eventManager.emit("fileExplorerFolderClick", elemTarget, folderPath, folderName)
			}
		})

		if (this.plugin.settings.hideIndexFiles) {
			FolderNoteModule.hideAllIndexFiles()
		}
	}

	unload() {
		this.plugin.eventManager.off("fileExplorerFolderClick", this.onFolderClick.bind(this))
		FolderNoteModule.showAllIndexFiles()
	}

	private async onSettingsUpdate(settings: PluginSetting) {
		if (!this.plugin.settings.hideIndexFiles) {
			FolderNoteModule.showAllIndexFiles()
		} else {
			FolderNoteModule.hideAllIndexFiles()
		}
	}

	private static hideAllIndexFiles() {
		const allFiles = document.getElementsByClassName("nav-file")
		for (let i = allFiles.length - 1; i >= 0; i--) {
			const file = allFiles[i]
			const folderName = file.parentElement.parentElement.children[0].textContent
			if (file.textContent == folderName) {
				file.addClass("hide-index-folder-note")
			}
		}
	}

	private static showAllIndexFiles() {
		const hiddenDocuments = document.getElementsByClassName("hide-index-folder-note")
		for (let i = hiddenDocuments.length - 1; i >= 0; i--) {
			hiddenDocuments[i].removeClass("hide-index-folder-note")
		}
	}

	private async onFolderClick(target: Element, path: string, name: string) {
		let indexFile = this.app.vault.getAbstractFileByPath(path + "/" + name + ".md") as TFile
		if (indexFile != null) {
			await this.app.workspace.activeLeaf.openFile(indexFile)
		} else if (this.plugin.settings.autoCreateIndexFile) {
			indexFile = await this.createIndexFile(path, name);
			new Notice("Created IndexFile for: " + name)
			await this.app.workspace.activeLeaf.openFile(indexFile)
		}

		if (this.plugin.settings.hideIndexFiles) {
			FolderNoteModule.hideAllIndexFiles()
		} else {
			FolderNoteModule.showAllIndexFiles()
		}
	}

	private async createIndexFile(path: string, name: string) {
		return await this.app.vault.create(`${path}/${name}.md`, this.plugin.settings.indexFileInitText)
	}

	private async onFileCreate(file: TAbstractFile) {
		if (file instanceof TFolder) {
			if (this.plugin.settings.autoCreateIndexFile) {
				await this.createIndexFile(file.path, file.name)
				new Notice("Created IndexFile for: " + file.name)
			}
		}
	}

	private async onFileRename(file: TAbstractFile, oldPath: string) {
		if (file instanceof TFolder && this.plugin.settings.autoRenameIndexFile) {
			const indexFile = file.children.find(value => {
				return value instanceof TFile && value.basename == oldPath;
			}) as TFile | null

			if (indexFile == null) {
				if (this.plugin.settings.autoCreateIndexFile) {
					await this.createIndexFile(file.path, file.name + ".md")
				} else {
					return
				}
			}

			// We are too fast. Have to update the path our self lol :D
			indexFile.path = file.path + "/" + indexFile.name
			const newFilePath = file.path + "/" + file.name + "." + indexFile.extension

			const conflictingFile = file.children.find(value => {
				return value instanceof TFile && value.basename == file.name;
			})

			if (conflictingFile != null) {
				new Notice(`Could not Automatically rename IndexFile because there already is a file with this name! This file will now be used!`)
				return
			}

			await this.app.fileManager.renameFile(indexFile, newFilePath)
		}
	}
}
