## Default Permission

This set of permissions describes the what kind of
file system access the `fs` plugin has enabled or denied by default.

#### Granted Permissions

This default permission set enables read access to the
application specific directories (AppConfig, AppData, AppLocalData, AppCache,
AppLog) and all files and sub directories created in it.
The location of these directories depends on the operating system,
where the application is run.

In general these directories need to be manually created
by the application at runtime, before accessing files or folders
in it is possible.

Therefore, it is also allowed to create all of these folders via
the `mkdir` command.

#### Denied Permissions

This default permission set prevents access to critical components
of the Tauri application by default.
On Windows the webview data folder access is denied.

#### Included permissions within this default permission set:


- `create-app-specific-dirs`
- `read-app-specific-dirs-recursive`
- `deny-default`

## Permission Table

<table>
<tr>
<th>Identifier</th>
<th>Description</th>
</tr>


<tr>
<td>

`fs2:allow-app-read-recursive`

</td>
<td>

This allows full recursive read access to the complete application folders, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-app-write-recursive`

</td>
<td>

This allows full recursive write access to the complete application folders, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-app-read`

</td>
<td>

This allows non-recursive read access to the application folders.

</td>
</tr>

<tr>
<td>

`fs2:allow-app-write`

</td>
<td>

This allows non-recursive write access to the application folders.

</td>
</tr>

<tr>
<td>

`fs2:allow-app-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the application folders, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-app-meta`

</td>
<td>

This allows non-recursive read access to metadata of the application folders, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-app-recursive`

</td>
<td>

This scope permits recursive access to the complete application folders, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-app`

</td>
<td>

This scope permits access to all files and list content of top level directories in the application folders.

</td>
</tr>

<tr>
<td>

`fs2:scope-app-index`

</td>
<td>

This scope permits to list all files and folders in the application directories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$APPCACHE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$APPCACHE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-read`

</td>
<td>

This allows non-recursive read access to the `$APPCACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-write`

</td>
<td>

This allows non-recursive write access to the `$APPCACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$APPCACHE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-appcache-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$APPCACHE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-appcache-recursive`

</td>
<td>

This scope permits recursive access to the complete `$APPCACHE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-appcache`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$APPCACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-appcache-index`

</td>
<td>

This scope permits to list all files and folders in the `$APPCACHE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$APPCONFIG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$APPCONFIG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-read`

</td>
<td>

This allows non-recursive read access to the `$APPCONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-write`

</td>
<td>

This allows non-recursive write access to the `$APPCONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$APPCONFIG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-appconfig-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$APPCONFIG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-appconfig-recursive`

</td>
<td>

This scope permits recursive access to the complete `$APPCONFIG` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-appconfig`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$APPCONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-appconfig-index`

</td>
<td>

This scope permits to list all files and folders in the `$APPCONFIG`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$APPDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$APPDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-read`

</td>
<td>

This allows non-recursive read access to the `$APPDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-write`

</td>
<td>

This allows non-recursive write access to the `$APPDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$APPDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-appdata-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$APPDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-appdata-recursive`

</td>
<td>

This scope permits recursive access to the complete `$APPDATA` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-appdata`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$APPDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-appdata-index`

</td>
<td>

This scope permits to list all files and folders in the `$APPDATA`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$APPLOCALDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$APPLOCALDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-read`

</td>
<td>

This allows non-recursive read access to the `$APPLOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-write`

</td>
<td>

This allows non-recursive write access to the `$APPLOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$APPLOCALDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-applocaldata-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$APPLOCALDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-applocaldata-recursive`

</td>
<td>

This scope permits recursive access to the complete `$APPLOCALDATA` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-applocaldata`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$APPLOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-applocaldata-index`

</td>
<td>

This scope permits to list all files and folders in the `$APPLOCALDATA`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$APPLOG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$APPLOG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-read`

</td>
<td>

This allows non-recursive read access to the `$APPLOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-write`

</td>
<td>

This allows non-recursive write access to the `$APPLOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$APPLOG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-applog-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$APPLOG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-applog-recursive`

</td>
<td>

This scope permits recursive access to the complete `$APPLOG` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-applog`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$APPLOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-applog-index`

</td>
<td>

This scope permits to list all files and folders in the `$APPLOG`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$AUDIO` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$AUDIO` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-read`

</td>
<td>

This allows non-recursive read access to the `$AUDIO` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-write`

</td>
<td>

This allows non-recursive write access to the `$AUDIO` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$AUDIO` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-audio-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$AUDIO` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-audio-recursive`

</td>
<td>

This scope permits recursive access to the complete `$AUDIO` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-audio`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$AUDIO` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-audio-index`

</td>
<td>

This scope permits to list all files and folders in the `$AUDIO`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$CACHE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$CACHE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-read`

</td>
<td>

This allows non-recursive read access to the `$CACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-write`

</td>
<td>

This allows non-recursive write access to the `$CACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$CACHE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-cache-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$CACHE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-cache-recursive`

</td>
<td>

This scope permits recursive access to the complete `$CACHE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-cache`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$CACHE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-cache-index`

</td>
<td>

This scope permits to list all files and folders in the `$CACHE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$CONFIG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$CONFIG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-read`

</td>
<td>

This allows non-recursive read access to the `$CONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-write`

</td>
<td>

This allows non-recursive write access to the `$CONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$CONFIG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-config-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$CONFIG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-config-recursive`

</td>
<td>

This scope permits recursive access to the complete `$CONFIG` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-config`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$CONFIG` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-config-index`

</td>
<td>

This scope permits to list all files and folders in the `$CONFIG`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$DATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$DATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-read`

</td>
<td>

This allows non-recursive read access to the `$DATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-write`

</td>
<td>

This allows non-recursive write access to the `$DATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$DATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-data-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$DATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-data-recursive`

</td>
<td>

This scope permits recursive access to the complete `$DATA` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-data`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$DATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-data-index`

</td>
<td>

This scope permits to list all files and folders in the `$DATA`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$DESKTOP` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$DESKTOP` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-read`

</td>
<td>

This allows non-recursive read access to the `$DESKTOP` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-write`

</td>
<td>

This allows non-recursive write access to the `$DESKTOP` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$DESKTOP` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-desktop-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$DESKTOP` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-desktop-recursive`

</td>
<td>

This scope permits recursive access to the complete `$DESKTOP` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-desktop`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$DESKTOP` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-desktop-index`

</td>
<td>

This scope permits to list all files and folders in the `$DESKTOP`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$DOCUMENT` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$DOCUMENT` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-read`

</td>
<td>

This allows non-recursive read access to the `$DOCUMENT` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-write`

</td>
<td>

This allows non-recursive write access to the `$DOCUMENT` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$DOCUMENT` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-document-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$DOCUMENT` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-document-recursive`

</td>
<td>

This scope permits recursive access to the complete `$DOCUMENT` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-document`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$DOCUMENT` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-document-index`

</td>
<td>

This scope permits to list all files and folders in the `$DOCUMENT`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$DOWNLOAD` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$DOWNLOAD` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-read`

</td>
<td>

This allows non-recursive read access to the `$DOWNLOAD` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-write`

</td>
<td>

This allows non-recursive write access to the `$DOWNLOAD` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$DOWNLOAD` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-download-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$DOWNLOAD` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-download-recursive`

</td>
<td>

This scope permits recursive access to the complete `$DOWNLOAD` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-download`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$DOWNLOAD` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-download-index`

</td>
<td>

This scope permits to list all files and folders in the `$DOWNLOAD`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$EXE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$EXE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-read`

</td>
<td>

This allows non-recursive read access to the `$EXE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-write`

</td>
<td>

This allows non-recursive write access to the `$EXE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$EXE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-exe-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$EXE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-exe-recursive`

</td>
<td>

This scope permits recursive access to the complete `$EXE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-exe`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$EXE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-exe-index`

</td>
<td>

This scope permits to list all files and folders in the `$EXE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$FONT` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$FONT` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-read`

</td>
<td>

This allows non-recursive read access to the `$FONT` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-write`

</td>
<td>

This allows non-recursive write access to the `$FONT` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$FONT` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-font-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$FONT` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-font-recursive`

</td>
<td>

This scope permits recursive access to the complete `$FONT` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-font`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$FONT` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-font-index`

</td>
<td>

This scope permits to list all files and folders in the `$FONT`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$HOME` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$HOME` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-read`

</td>
<td>

This allows non-recursive read access to the `$HOME` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-write`

</td>
<td>

This allows non-recursive write access to the `$HOME` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$HOME` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-home-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$HOME` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-home-recursive`

</td>
<td>

This scope permits recursive access to the complete `$HOME` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-home`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$HOME` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-home-index`

</td>
<td>

This scope permits to list all files and folders in the `$HOME`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$LOCALDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$LOCALDATA` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-read`

</td>
<td>

This allows non-recursive read access to the `$LOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-write`

</td>
<td>

This allows non-recursive write access to the `$LOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$LOCALDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-localdata-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$LOCALDATA` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-localdata-recursive`

</td>
<td>

This scope permits recursive access to the complete `$LOCALDATA` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-localdata`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$LOCALDATA` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-localdata-index`

</td>
<td>

This scope permits to list all files and folders in the `$LOCALDATA`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$LOG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$LOG` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-read`

</td>
<td>

This allows non-recursive read access to the `$LOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-write`

</td>
<td>

This allows non-recursive write access to the `$LOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$LOG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-log-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$LOG` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-log-recursive`

</td>
<td>

This scope permits recursive access to the complete `$LOG` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-log`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$LOG` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-log-index`

</td>
<td>

This scope permits to list all files and folders in the `$LOG`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$PICTURE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$PICTURE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-read`

</td>
<td>

This allows non-recursive read access to the `$PICTURE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-write`

</td>
<td>

This allows non-recursive write access to the `$PICTURE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$PICTURE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-picture-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$PICTURE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-picture-recursive`

</td>
<td>

This scope permits recursive access to the complete `$PICTURE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-picture`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$PICTURE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-picture-index`

</td>
<td>

This scope permits to list all files and folders in the `$PICTURE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$PUBLIC` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$PUBLIC` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-read`

</td>
<td>

This allows non-recursive read access to the `$PUBLIC` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-write`

</td>
<td>

This allows non-recursive write access to the `$PUBLIC` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$PUBLIC` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-public-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$PUBLIC` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-public-recursive`

</td>
<td>

This scope permits recursive access to the complete `$PUBLIC` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-public`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$PUBLIC` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-public-index`

</td>
<td>

This scope permits to list all files and folders in the `$PUBLIC`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$RESOURCE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$RESOURCE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-read`

</td>
<td>

This allows non-recursive read access to the `$RESOURCE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-write`

</td>
<td>

This allows non-recursive write access to the `$RESOURCE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$RESOURCE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-resource-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$RESOURCE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-resource-recursive`

</td>
<td>

This scope permits recursive access to the complete `$RESOURCE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-resource`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$RESOURCE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-resource-index`

</td>
<td>

This scope permits to list all files and folders in the `$RESOURCE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$RUNTIME` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$RUNTIME` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-read`

</td>
<td>

This allows non-recursive read access to the `$RUNTIME` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-write`

</td>
<td>

This allows non-recursive write access to the `$RUNTIME` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$RUNTIME` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-runtime-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$RUNTIME` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-runtime-recursive`

</td>
<td>

This scope permits recursive access to the complete `$RUNTIME` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-runtime`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$RUNTIME` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-runtime-index`

</td>
<td>

This scope permits to list all files and folders in the `$RUNTIME`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$TEMP` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$TEMP` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-read`

</td>
<td>

This allows non-recursive read access to the `$TEMP` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-write`

</td>
<td>

This allows non-recursive write access to the `$TEMP` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$TEMP` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-temp-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$TEMP` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-temp-recursive`

</td>
<td>

This scope permits recursive access to the complete `$TEMP` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-temp`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$TEMP` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-temp-index`

</td>
<td>

This scope permits to list all files and folders in the `$TEMP`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$TEMPLATE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$TEMPLATE` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-read`

</td>
<td>

This allows non-recursive read access to the `$TEMPLATE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-write`

</td>
<td>

This allows non-recursive write access to the `$TEMPLATE` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$TEMPLATE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-template-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$TEMPLATE` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-template-recursive`

</td>
<td>

This scope permits recursive access to the complete `$TEMPLATE` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-template`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$TEMPLATE` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-template-index`

</td>
<td>

This scope permits to list all files and folders in the `$TEMPLATE`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-read-recursive`

</td>
<td>

This allows full recursive read access to the complete `$VIDEO` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-write-recursive`

</td>
<td>

This allows full recursive write access to the complete `$VIDEO` folder, files and subdirectories.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-read`

</td>
<td>

This allows non-recursive read access to the `$VIDEO` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-write`

</td>
<td>

This allows non-recursive write access to the `$VIDEO` folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-meta-recursive`

</td>
<td>

This allows full recursive read access to metadata of the `$VIDEO` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:allow-video-meta`

</td>
<td>

This allows non-recursive read access to metadata of the `$VIDEO` folder, including file listing and statistics.

</td>
</tr>

<tr>
<td>

`fs2:scope-video-recursive`

</td>
<td>

This scope permits recursive access to the complete `$VIDEO` folder, including sub directories and files.

</td>
</tr>

<tr>
<td>

`fs2:scope-video`

</td>
<td>

This scope permits access to all files and list content of top level directories in the `$VIDEO` folder.

</td>
</tr>

<tr>
<td>

`fs2:scope-video-index`

</td>
<td>

This scope permits to list all files and folders in the `$VIDEO`folder.

</td>
</tr>

<tr>
<td>

`fs2:allow-copy-file`

</td>
<td>

Enables the copy_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-copy-file`

</td>
<td>

Denies the copy_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-create`

</td>
<td>

Enables the create command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-create`

</td>
<td>

Denies the create command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-exists`

</td>
<td>

Enables the exists command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-exists`

</td>
<td>

Denies the exists command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-fetch-and-save`

</td>
<td>

Enables the fetch_and_save command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-fetch-and-save`

</td>
<td>

Denies the fetch_and_save command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-fstat`

</td>
<td>

Enables the fstat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-fstat`

</td>
<td>

Denies the fstat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-ftruncate`

</td>
<td>

Enables the ftruncate command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-ftruncate`

</td>
<td>

Denies the ftruncate command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-lstat`

</td>
<td>

Enables the lstat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-lstat`

</td>
<td>

Denies the lstat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-mkdir`

</td>
<td>

Enables the mkdir command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-mkdir`

</td>
<td>

Denies the mkdir command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-open`

</td>
<td>

Enables the open command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-open`

</td>
<td>

Denies the open command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read`

</td>
<td>

Enables the read command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read`

</td>
<td>

Denies the read command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read-dir`

</td>
<td>

Enables the read_dir command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read-dir`

</td>
<td>

Denies the read_dir command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read-file`

</td>
<td>

Enables the read_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read-file`

</td>
<td>

Denies the read_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read-text-file`

</td>
<td>

Enables the read_text_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read-text-file`

</td>
<td>

Denies the read_text_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read-text-file-lines`

</td>
<td>

Enables the read_text_file_lines command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read-text-file-lines`

</td>
<td>

Denies the read_text_file_lines command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-read-text-file-lines-next`

</td>
<td>

Enables the read_text_file_lines_next command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-read-text-file-lines-next`

</td>
<td>

Denies the read_text_file_lines_next command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-remove`

</td>
<td>

Enables the remove command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-remove`

</td>
<td>

Denies the remove command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-rename`

</td>
<td>

Enables the rename command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-rename`

</td>
<td>

Denies the rename command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-seek`

</td>
<td>

Enables the seek command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-seek`

</td>
<td>

Denies the seek command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-size`

</td>
<td>

Enables the size command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-size`

</td>
<td>

Denies the size command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-stat`

</td>
<td>

Enables the stat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-stat`

</td>
<td>

Denies the stat command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-truncate`

</td>
<td>

Enables the truncate command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-truncate`

</td>
<td>

Denies the truncate command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-unwatch`

</td>
<td>

Enables the unwatch command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-unwatch`

</td>
<td>

Denies the unwatch command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-watch`

</td>
<td>

Enables the watch command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-watch`

</td>
<td>

Denies the watch command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-write`

</td>
<td>

Enables the write command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-write`

</td>
<td>

Denies the write command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-write-file`

</td>
<td>

Enables the write_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-write-file`

</td>
<td>

Denies the write_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:allow-write-text-file`

</td>
<td>

Enables the write_text_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:deny-write-text-file`

</td>
<td>

Denies the write_text_file command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`fs2:create-app-specific-dirs`

</td>
<td>

This permissions allows to create the application specific directories.


</td>
</tr>

<tr>
<td>

`fs2:deny-default`

</td>
<td>

This denies access to dangerous Tauri relevant files and folders by default.

</td>
</tr>

<tr>
<td>

`fs2:deny-webview-data-linux`

</td>
<td>

This denies read access to the
`$APPLOCALDATA` folder on linux as the webview data and configuration values are stored here.
Allowing access can lead to sensitive information disclosure and should be well considered.

</td>
</tr>

<tr>
<td>

`fs2:deny-webview-data-windows`

</td>
<td>

This denies read access to the
`$APPLOCALDATA/EBWebView` folder on windows as the webview data and configuration values are stored here.
Allowing access can lead to sensitive information disclosure and should be well considered.

</td>
</tr>

<tr>
<td>

`fs2:read-all`

</td>
<td>

This enables all read related commands without any pre-configured accessible paths.

</td>
</tr>

<tr>
<td>

`fs2:read-app-specific-dirs-recursive`

</td>
<td>

This permission allows recursive read functionality on the application
specific base directories. 


</td>
</tr>

<tr>
<td>

`fs2:read-dirs`

</td>
<td>

This enables directory read and file metadata related commands without any pre-configured accessible paths.

</td>
</tr>

<tr>
<td>

`fs2:read-files`

</td>
<td>

This enables file read related commands without any pre-configured accessible paths.

</td>
</tr>

<tr>
<td>

`fs2:read-meta`

</td>
<td>

This enables all index or metadata related commands without any pre-configured accessible paths.

</td>
</tr>

<tr>
<td>

`fs2:scope`

</td>
<td>

An empty permission you can use to modify the global scope.

</td>
</tr>

<tr>
<td>

`fs2:write-all`

</td>
<td>

This enables all write related commands without any pre-configured accessible paths.

</td>
</tr>

<tr>
<td>

`fs2:write-files`

</td>
<td>

This enables all file write related commands without any pre-configured accessible paths.

</td>
</tr>
</table>
