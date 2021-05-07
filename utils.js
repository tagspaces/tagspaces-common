function extractFileExtension(filePath) {
  const lastindexDirSeparator = filePath.lastIndexOf("/");
  const lastIndexEndTagContainer = filePath.lastIndexOf(eTagContainer);
  const lastindexDot = filePath.lastIndexOf(".");
  if (lastindexDot < 0) {
    return "";
  }
  if (lastindexDot < lastindexDirSeparator) {
    // case: "../remote.php/webdav/somefilename"
    return "";
  }
  if (lastindexDot < lastIndexEndTagContainer) {
    // case: "[20120125 89.4kg 19.5% 60.5% 39.8% 2.6kg]"
    return "";
  }
  let extension = filePath
    .substring(lastindexDot + 1, filePath.length)
    .toLowerCase()
    .trim();
  const lastindexQuestionMark = extension.lastIndexOf("?");
  if (lastindexQuestionMark > 0) {
    // Removing everything after ? in URLs .png?queryParam1=2342
    extension = extension.substring(0, lastindexQuestionMark);
  }
  return extension;

  /* alternative implementation
          const ext = fileURL.split('.').pop();
          return (ext === fileURL) ? '' : ext; */
}

function extractTagsAsObjects(filePath) {
  const tagsInFileName = extractTags(filePath);
  const tagArray = [];
  tagsInFileName.map((tag) => {
    tagArray.push({
      title: "" + tag,
      type: "plain",
    });
    return true;
  });
  return tagArray;
}

function extractTags(filePath) {
  // console.log('Extracting tags from: ' + filePath);
  const fileName = extractFileName(filePath);
  // WithoutExt
  let tags = [];
  const beginTagContainer = fileName.indexOf(bTagContainer);
  const endTagContainer = fileName.indexOf(eTagContainer);
  if (
    beginTagContainer < 0 ||
    endTagContainer < 0 ||
    beginTagContainer >= endTagContainer
  ) {
    // console.log('Filename does not contains tags. Aborting extraction.');
    return tags;
  }
  const cleanedTags = [];
  const tagContainer = fileName
    .slice(beginTagContainer + 1, endTagContainer)
    .trim();
  tags = tagContainer.split(tagDelimiter);
  for (let i = 0; i < tags.length; i += 1) {
    // Min tag length set to 1 character
    if (tags[i].trim().length > 0) {
      cleanedTags.push(tags[i]);
    }
  }
  return cleanedTags;
}

module.exports = {
  extractTagsAsObjects,
};
