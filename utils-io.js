const paths = require("./paths");
const AppConfig = require("./AppConfig");

function walkDirectory(
  path,
  listDirectoryPromise,
  options = {},
  fileCallback,
  dirCallback
) {
  const mergedOptions = {
    recursive: false,
    skipMetaFolder: true,
    skipDotHiddenFolder: false,
    loadMetaDate: true,
    extractText: false,
    ...options,
  };
  return (
    listDirectoryPromise(path, false, mergedOptions.extractText)
      // @ts-ignore
      .then((entries) =>
        // if (window.walkCanceled) {
        //     return false;
        // }
        Promise.all(
          entries.map((entry) => {
            // if (window.walkCanceled) {
            //     return false;
            // }

            if (entry.isFile) {
              if (fileCallback) {
                fileCallback(entry);
              }
              return entry;
            }

            if (dirCallback) {
              dirCallback(entry);
            }

            if (mergedOptions.recursive) {
              if (
                mergedOptions.skipDotHiddenFolder &&
                entry.name.startsWith(".") &&
                entry.name !== AppConfig.metaFolder
              ) {
                return entry;
              }
              if (
                mergedOptions.skipMetaFolder &&
                entry.name === AppConfig.metaFolder
              ) {
                return entry;
              }
              return walkDirectory(
                entry.path,
                listDirectoryPromise,
                mergedOptions,
                fileCallback,
                dirCallback
              );
            }
            return entry;
          })
        )
      )
      .catch((err) => {
        console.warn("Error walking directory " + err);
        return err;
      })
  );
}

function enhanceEntry(entry) {
  let fileNameTags = [];
  if (entry.isFile) {
    fileNameTags = paths.extractTagsAsObjects(entry.name, " ", "/");
  }
  let sidecarDescription = "";
  let sidecarColor = "";
  let sidecarTags = [];
  if (entry.meta) {
    sidecarDescription = entry.meta.description || "";
    sidecarColor = entry.meta.color || "";
    if (entry.meta.tags && entry.meta.tags.length > 0) {
      entry.meta.tags.forEach((tag) => {
        const cleanedTag = {
          title: tag.title,
        };
        if (tag.color) {
          cleanedTag.color = tag.color;
        }
        if (tag.textcolor) {
          cleanedTag.textcolor = tag.textcolor;
        }
        sidecarTags.push(cleanedTag);
      });
    }
  }
  const enhancedEntry = {
    name: entry.name,
    isFile: entry.isFile,
    extension: entry.isFile ? paths.extractFileExtension(entry.name) : "",
    tags: [...sidecarTags, ...fileNameTags],
    size: entry.size,
    lmdt: entry.lmdt,
    path: entry.path,
  };
  if (sidecarDescription) {
    enhancedEntry.description = sidecarDescription;
  }
  // enhancedEntry.description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam vitae magna rhoncus, rutrum dolor id, vestibulum arcu. Maecenas scelerisque nisl quis sollicitudin dapibus. Ut pulvinar est sed nunc finibus cursus. Nam semper felis eu ex auctor, nec semper lectus sagittis. Donec dictum volutpat lorem, in mollis turpis scelerisque in. Morbi pulvinar egestas turpis, euismod suscipit leo egestas eget. Nullam ac mollis sem. \n Quisque luctus dapibus elit, sed molestie ipsum tempor quis. Sed urna turpis, mattis quis orci ac, placerat lacinia est. Pellentesque quis arcu malesuada, consequat magna ut, tincidunt eros. Aenean sodales nisl finibus pharetra blandit. Pellentesque egestas magna et lectus tempor ultricies. Phasellus sed ornare leo. Vivamus sed massa erat. \n Mauris eu dignissim justo, eget luctus nisi. Ut nec arcu quis ligula tempor porttitor. Pellentesque in pharetra quam. Nulla nec ornare magna. Phasellus interdum dictum mauris eget laoreet. In vulputate massa sem, a mattis elit turpis duis.';
  if (entry && entry.thumbPath) {
    enhancedEntry.thumbPath = entry.thumbPath;
  }
  if (entry && entry.textContent) {
    enhancedEntry.textContent = entry.textContent;
  }
  if (sidecarColor) {
    enhancedEntry.color = sidecarColor;
  }
  // console.log('Enhancing ' + entry.path); console.log(enhancedEntry);
  return enhancedEntry;
}

module.exports = {
  walkDirectory,
  enhanceEntry,
};
