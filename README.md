# Folder Index for Obsidian

![Latest Version](https://img.shields.io/github/v/release/turulix/obsidian-folder-index?sort=semver)
![GitHub downloads](https://img.shields.io/github/downloads/turulix/obsidian-folder-index/total)
![Build Status](https://img.shields.io/github/actions/workflow/status/turulix/obsidian-folder-index/release.yml)
![GitHub stars](https://img.shields.io/github/stars/turulix/obsidian-folder-index?style=social)

## Features

- Automatic index file generation
- Automatic renaming of index files (if you rename the folder)
- Automatic linking of files in the folder
- Alphabetic sorting of files
- Alphabetic sorting of headings
- Rewritten Graph View to show the folder structure, and link them accordingly
- Support for [File Tree Alternative Plugin](https://github.com/ozntel/file-tree-alternative) (I highly recommend this
  plugin)

### How to use

It's pretty simple. You simply install the Plugin like any other. After this you can click on any folder
to open their index file, if none exists one will automatically be generated for you (You should definitely check out
the settings and toggle the features you like)

From now on you should be able to use folders like they are a normal note!

Folders will also be added to the Graph View by default and link all files that are contained within it :D

#### Manual Indexing

You can also use the ``folder-index-content`` Block processor directly like this:

````
```folder-index-content
```
````

to include the content of the folder index in any note you want.

#### Frontmatter

| Key   | Description                                       |
|-------|---------------------------------------------------|
| title | This will overwrite the Filename inside the Index |

### Code Block Configuration

The `folder-index-content` code block supports the following configuration options:

| Option | Description | Example |
|--------|-------------|---------|
| title | This will overwrite the Filename inside the Index | `title: My Custom Title` |
| ignore | Files/folders to exclude from the content (supports wildcards) | `ignore: *.pdf, *img*, temp` |
| recursionLimit | Override the global subfolder limit for this index | `recursionLimit: 2` |

Example:
````md
```folder-index-content
title: Project Files
ignore: *.pdf, *img*, temp, Folder/
recursionLimit: 2
```
````

The `ignore` option supports:
- Multiple patterns separated by commas
- Wildcards using `*` (e.g., `*.pdf` to exclude all PDF files)
- This works in addition to the global exclude patterns in the plugin settings

### Settings

| Setting | Description |
|---------|-------------|
| Graph View | Overwrite the default graph view to show folder structure |
| Root Index File | The file used for the root index |
| Initial Content | Default content for new folder indexes |
| Excluded Folders | Folders that won't create index files automatically |
| Excluded Patterns | Files/folders to exclude from content (supports wildcards) |
| Only Show Markdown Files | When enabled, only markdown files will be shown in indexes |
| Auto Generate Index | Create index files automatically for new folders |
| Auto Rename Index | Rename index files when folders are renamed |
| User Defined Index Name | Use a custom name for index files |
| Index Filename | The custom filename for indexes |

### Manual Installation

1. Go to [Releases](https://github.com/turulix/obsidian-folder-index/releases) and download the ZIP file from the latest
   release.
2. This ZIP file should be extracted in your Obsidian plugins folder. If you don't know where that is, you can go
   to `Community Plugins` inside Obsidian. There is a folder icon on the right of `Installed Plugins`. Click that and it
   opens your plugin's folder.
3. Extract the contents of the ZIP file there.
4. Now you should have a folder in plugins called 'obsidian-folder-index' containing a `main.js` file, `manifest.json`
   file, and a `styles.css` file.

### Donations

If you like this plugin and want to support me, consider buying me a coffee :D
Spend way too much on coffee during development already :P
[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/turulix)
