const pathLib = require("path");
const misc = require("../../../packages/common/misc");
const fs = require("fs");

describe("Common misc unit tests", () => {
  test("misc.prepareTagGroupForExport", () => {
    const tagGroup = {
      title: "tagGroup",
      locationId: "locationId",
      children: [
        {
          title: "tag1",
          type: "plain",
        },
        {
          title: "tag2",
          type: "plain",
        },
      ],
    };

    const expected = {
      title: "tagGroup",
      children: [
        {
          title: "tag1",
          type: "plain",
        },
        {
          title: "tag2",
          type: "plain",
        },
      ],
    };

    const tagGroupForExport = misc.prepareTagGroupForExport(tagGroup);
    expect(tagGroupForExport).toEqual(expected);
  });

  test("misc.prepareTagForExport", () => {
    const tag = {
      id: "tagId",
      title: "tag",
      type: "plain",
    };

    const expected = {
      title: "tag",
      type: "plain",
    };

    const tagForExport = misc.prepareTagForExport(tag);
    expect(tagForExport).toEqual(expected);
  });

  test("misc.escapeRegExp", () => {
    const input = "abc\\def";
    const expected = "abc\\\\def";
    const output = misc.escapeRegExp(input);
    expect(output).toEqual(expected);
  });
  test("misc.parseTextQuery", () => {
    const textQuery = "+tag1 +tag2";
    const output = misc.parseTextQuery(textQuery, "+");
    expect(output).toEqual([{ title: "tag1" }, { title: "tag2" }]);
  });
  test("misc.removeAllTagsFromSearchQuery", () => {
    const textQuery = "search +tag1 -tag2 |tag3";
    const output = misc.removeAllTagsFromSearchQuery(textQuery);
    expect(output).toEqual("search");
  });
  test("misc.mergeWithExtractedTags", () => {
    const tags = [{ title: "tag1" }, { title: "tag2" }];
    const textQuery = "+tag3 +tag4";
    const output = misc.mergeWithExtractedTags(textQuery, tags, "+");
    expect(output).toEqual([
      { title: "tag1" },
      { title: "tag2" },
      { title: "tag3" },
      { title: "tag4" },
    ]);
  });

  /*test("misc.getUniqueTags", () => {
    const tags = [{ title: "tag1" }, { title: "tag2" }];
    const tags2 = [{ title: "tag1" }, { title: "tag3" }];
    const output = misc.getUniqueTags(tags,tags2);
    expect(output).toEqual([{ title: "tag1" }, { title: "tag2" }, { title: "tag3" }]);
  });*/

  test("misc.immutablySwapItems", () => {
    const items = [{ title: "tag1" }, { title: "tag2" }, { title: "tag3" }];
    const output = misc.immutablySwapItems(items, 0, 2);
    expect(output).toEqual([
      { title: "tag3" },
      { title: "tag2" },
      { title: "tag1" },
    ]);
  });

  test("misc.arrayBufferToBuffer", () => {
    const arrayBuffer = new ArrayBuffer(10);
    const buffer = misc.arrayBufferToBuffer(arrayBuffer);
    expect(buffer).toBeInstanceOf(Buffer);
  });
  test("misc.streamToBuffer", async () => {
    const stream = fs.createReadStream(
      pathLib.join(__dirname, "..", "..", "img.jpg")
    );
    const buffer = await misc.streamToBuffer(stream);
    expect(buffer).toBeInstanceOf(Buffer);
  });
  test("misc.formatFileSize", () => {
    const output = misc.formatFileSize(10);
    expect(output).toEqual("10 B");
  });
  test("misc.formatFileSize2", () => {
    const output = misc.formatFileSize2(1025);
    expect(output).toEqual("1.0 KiB");
  });
  /*test("misc.formatDateTime", () => {
    const date = new Date();
    const output = misc.formatDateTime(date, false);
    const dateTime = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss", Locale.getDefaut()).format(new Date());
    expect(output).toEqual(
        date.toString().replace(/T/, " - ").replace(/\..+/, "")
    );
  });*/
  test("misc.convertStringToDate", () => {
    const output = misc.convertStringToDate("20200101");
    expect(output.toISOString()).toEqual("2020-01-01T00:00:00.000Z");
  });
  test("misc.sortByCriteria", () => {
    const items = [
      { name: "b", isFile: true, size: 30 },
      { name: "a", isFile: true, size: 20 },
      { name: "c", isFile: true, size: 10 },
      { name: "0", isFile: true, size: 11 },
      { name: "2", isFile: true, size: 12 },
      { name: "1", isFile: true, size: 13 },
      { name: "02", isFile: true, size: 14 },
      { name: "01", isFile: true, size: 15 },
      { name: "10", isFile: true, size: 16 },
    ];
    const reversedItems = [...items].reverse();
    //asc
    let output = misc.sortByCriteria(items, "byName", false);
    expect(output).toEqual([
      { name: "a", isFile: true, size: 20 },
      { name: "b", isFile: true, size: 30 },
      { name: "c", isFile: true, size: 10 },
      { name: "0", isFile: true, size: 11 },
      { name: "1", isFile: true, size: 13 },
      { name: "01", isFile: true, size: 15 },
      { name: "2", isFile: true, size: 12 },
      { name: "02", isFile: true, size: 14 },
      { name: "10", isFile: true, size: 16 },
    ]);
    //asc reverse
    output = misc.sortByCriteria(reversedItems, "byName", false);
    expect(output).toEqual([
      { name: "0", isFile: true, size: 11 },
      { name: "01", isFile: true, size: 15 },
      { name: "1", isFile: true, size: 13 },
      { name: "02", isFile: true, size: 14 },
      { name: "2", isFile: true, size: 12 },
      { name: "10", isFile: true, size: 16 },
      { name: "a", isFile: true, size: 20 },
      { name: "b", isFile: true, size: 30 },
      { name: "c", isFile: true, size: 10 },
    ]);
    //desc
    output = misc.sortByCriteria(items, "byName", true);
    expect(output).toEqual([
      { name: "10", isFile: true, size: 16 },
      { name: "02", isFile: true, size: 14 },
      { name: "2", isFile: true, size: 12 },
      { name: "01", isFile: true, size: 15 },
      { name: "1", isFile: true, size: 13 },
      { name: "0", isFile: true, size: 11 },
      { name: "c", isFile: true, size: 10 },
      { name: "b", isFile: true, size: 30 },
      { name: "a", isFile: true, size: 20 },
    ]);

    //desc reversed
    output = misc.sortByCriteria(reversedItems, "byName", true);
    expect(output).toEqual([
      { name: "c", isFile: true, size: 10 },
      { name: "b", isFile: true, size: 30 },
      { name: "a", isFile: true, size: 20 },
      { name: "10", isFile: true, size: 16 },
      { name: "2", isFile: true, size: 12 },
      { name: "02", isFile: true, size: 14 },
      { name: "1", isFile: true, size: 13 },
      { name: "01", isFile: true, size: 15 },
      { name: "0", isFile: true, size: 11 },
    ]);

    output = misc.sortByCriteria(items, "byFileSize", true);
    expect(output).toEqual([
      { name: "c", isFile: true, size: 10 },
      { name: "0", isFile: true, size: 11 },
      { name: "2", isFile: true, size: 12 },
      { name: "1", isFile: true, size: 13 },
      { name: "02", isFile: true, size: 14 },
      { name: "01", isFile: true, size: 15 },
      { name: "10", isFile: true, size: 16 },
      { name: "a", isFile: true, size: 20 },
      { name: "b", isFile: true, size: 30 },
    ]);
  });
});
