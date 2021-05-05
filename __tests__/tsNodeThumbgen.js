const fs = require("fs-extra");
const path = require("path");
const thumbGen = require("../tsthumbgen");

it("gen image thumbnail", async () => {
  const image = fs.readFileSync(path.resolve(__dirname, "img.jpg"));
  const metaFolder = ".ts";
  const destinationPath = path.resolve(__dirname, "image-thumb.jpg");

  const upload = (imagePath, data) => {
    const pathParts = path.parse(imagePath);
    const dirName =
      (pathParts.dir ? pathParts.dir + "/" : "") + metaFolder + "/";
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    const thumbName = dirName + pathParts.base + ".jpg";

    fs.writeFileSync(thumbName, data);

    expect(fs.existsSync(thumbName)).toBe(true);
  };

  thumbGen.generateImageThumbnail(image, "jpg", destinationPath, upload);
  //expect(sum(1, 2)).toBe(3);
});
