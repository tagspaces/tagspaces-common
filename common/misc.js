/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
const paths = require("./paths");

const locationType = {
  TYPE_LOCAL: "0",
  TYPE_CLOUD: "1",
  TYPE_AMPLIFY: "2",
  TYPE_WEBDAV: "3",
};

/**
 * @param tagGroup: TS.TagGroup
 * @returns {TS.TagGroup}
 */
function prepareTagGroupForExport(tagGroup) {
  const preparedTagGroup = {
    title: tagGroup.title,
    uuid: tagGroup.uuid,
    children: [],
  };
  if (tagGroup.created_date) {
    preparedTagGroup.created_date = tagGroup.created_date;
  }
  if (tagGroup.color) {
    preparedTagGroup.color = tagGroup.color;
  }
  if (tagGroup.textcolor) {
    preparedTagGroup.textcolor = tagGroup.textcolor;
  }
  if (tagGroup.modified_date) {
    preparedTagGroup.modified_date = tagGroup.modified_date;
  }
  if (tagGroup.expanded) {
    preparedTagGroup.expanded = tagGroup.expanded;
  }
  if (tagGroup.children && tagGroup.children.length > 0) {
    tagGroup.children.forEach((tag) => {
      const cleanedTag = prepareTagForExport(tag);
      if (cleanedTag.title) {
        preparedTagGroup.children.push(prepareTagForExport(cleanedTag));
      }
    });
  }
  return preparedTagGroup;
}
/**
 * @param tag TS.Tag
 */
function prepareTagForExport(tag) {
  return {
    title: tag.title,
    ...(tag.color && { color: tag.color }),
    ...(tag.textcolor && { textcolor: tag.textcolor }),
    ...(tag.type && { type: tag.type }),
    ...(tag.description && { description: tag.description }),
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * @param textQuery: string
 * @param identifier: string
 * @returns {[TS.Tag]}
 */
function parseTextQuery(textQuery, identifier) {
  const extractedTags = [];
  let query = textQuery;
  if (query && query.length > 0) {
    query = query
      .trim()
      .replace(new RegExp(escapeRegExp(identifier) + "\\s+", "g"), identifier);
    const textQueryParts = query.split(" ");
    if (textQueryParts) {
      // && textQueryParts.length > 1) {
      textQueryParts.forEach((part) => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith(identifier)) {
          const tagTitle = trimmedPart.substr(1).trim();
          extractedTags.push({
            title: tagTitle,
          });
        }
      });
    }
  }
  return extractedTags;
}

/**
 * @param query: string
 * @returns {string}
 */
function removeAllTagsFromSearchQuery(query) {
  if (!query) {
    return "";
  }
  // return query.replace(/([+-?]\S+)/g, '').trim();
  const queryArray = query.split(" ");
  const returnArray = queryArray.filter(
    (q) => !q.startsWith("+") && !q.startsWith("-") && !q.startsWith("|")
  );
  return returnArray.join(" ").trim();
}

/**
 * @param textQuery : string
 * @param tags: Array<TS.Tag>
 * @param identifier: string
 * @returns {undefined|Array<TS.Tag>|TS.Tag[]|*}
 */
function mergeWithExtractedTags(textQuery, tags, identifier) {
  const extractedTags = parseTextQuery(textQuery, identifier);
  if (tags) {
    if (extractedTags.length > 0) {
      return getUniqueTags(tags, extractedTags);
    }
    return tags;
  }
  if (extractedTags.length > 0) {
    return extractedTags;
  }
  return undefined;
}

/**
 * @param tags1: Array<TS.Tag>
 * @param tags2: Array<TS.Tag>
 * @returns {TS.Tag[]}
 */
function getUniqueTags(tags1, tags2) {
  const mergedArray = [...tags1, ...tags2];
  // mergedArray have duplicates, lets remove the duplicates using Set
  const set = new Set();
  return mergedArray.filter((tag) => {
    if (!set.has(tag.title)) {
      set.add(tag.title);
      return true;
    }
    return false;
  }, set);
}

/**
 * @param objArr: Array<Object>
 * @param func
 */
function traverse(objArr, func) {
  objArr.forEach((obj) => {
    Object.keys(obj).map((objKey) => {
      func.apply(this, [obj, objKey]);
      if (objKey === "subPages" && typeof Array.isArray(obj[objKey])) {
        traverse(obj[objKey], func);
      }
      return true;
    });
  });
}

/**
 * @param items
 * @param firstIndex: number
 * @param secondIndex: number
 * @returns {*}
 */
function immutablySwapItems(items, firstIndex, secondIndex) {
  const results = items.slice();
  const firstItem = items[firstIndex];
  results[firstIndex] = items[secondIndex];
  results[secondIndex] = firstItem;
  return results;
}

/**
 * Convert 64bit url string to Blob
 * @name b64toBlob
 * @method
 * @param {string} b64Data - the 64bit url string which should be converted to Blob
 * @param {string} contentType - content type of blob
 * @param {int} sliceSize - optional size of slices if omited 512 is used as default
 * @returns {Blob}
 */
function b64toBlob(b64Data, contentType = "", sliceSize = 512) {
  const byteCharacters = Buffer.from(b64Data, "base64"); // atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

/**
 * @param min: number
 * @param max: number
 * @returns {number}
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function arrayBufferToBuffer(content) {
  const buffer = Buffer.alloc(content.byteLength);
  const view = new Uint8Array(content);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

/**
 * @param sizeInBytes: number
 * @returns {string}
 */
function formatFileSize(sizeInBytes) {
  const kilobyte = 1024;
  const megabyte = kilobyte * kilobyte;
  const gigabyte = megabyte * kilobyte;
  const terabyte = gigabyte * kilobyte;
  const precision = 2;

  if (sizeInBytes >= 0 && sizeInBytes < kilobyte) {
    return sizeInBytes + " B";
  }
  if (sizeInBytes >= kilobyte && sizeInBytes < megabyte) {
    return (sizeInBytes / kilobyte).toFixed(precision) + " KB";
  }
  if (sizeInBytes >= megabyte && sizeInBytes < gigabyte) {
    return (sizeInBytes / megabyte).toFixed(precision) + " MB";
  }
  if (sizeInBytes >= gigabyte && sizeInBytes < terabyte) {
    return (sizeInBytes / gigabyte).toFixed(precision) + " GB";
  }
  if (sizeInBytes >= terabyte) {
    return (sizeInBytes / terabyte).toFixed(precision) + " TB";
  }
  return sizeInBytes + "";
}

/**
 * @param sizeInBytes: number
 * @param siSystem: boolean
 * @returns {string}
 */
function formatFileSize2(sizeInBytes, siSystem) {
  const threshold = siSystem ? 1000 : 1024;
  if (!sizeInBytes) {
    return "";
  }
  if (sizeInBytes < threshold) {
    return sizeInBytes + " B";
  }
  const units = siSystem
    ? ["kB", "MB", "GB", "TB", "PB", "EB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  let cUnit = -1;
  do {
    sizeInBytes /= threshold;
    ++cUnit;
  } while (sizeInBytes >= threshold);
  return sizeInBytes.toFixed(1) + " " + units[cUnit];
}

/**
 * @param date: string | number
 * @param includeTime: boolean
 * @returns {string}
 */
function formatDateTime(date, includeTime) {
  if (date === undefined || date === "") {
    return "";
  }
  const d = new Date(date);
  let cDate = "" + d.getDate();
  cDate += "";
  if (cDate.length === 1) {
    cDate = "0" + cDate;
  }
  let cMonth = "" + (d.getMonth() + 1);
  cMonth += "";
  if (cMonth.length === 1) {
    cMonth = "0" + cMonth;
  }
  const cYear = "" + d.getFullYear();
  let cHour = "" + d.getHours();
  cHour += "";
  if (cHour.length === 1) {
    cHour = "0" + cHour;
  }
  let cMinute = "" + d.getMinutes();
  cMinute += "";
  if (cMinute.length === 1) {
    cMinute = "0" + cMinute;
  }
  let cSecond = "" + d.getSeconds();
  cSecond += "";
  if (cSecond.length === 1) {
    cSecond = "0" + cSecond;
  }
  let time = "";
  if (includeTime) {
    time = " - " + cHour + ":" + cMinute + ":" + cSecond;
  }
  return cYear + "-" + cMonth + "-" + cDate + time;
}

/**
 * Convert a date in the following format 20191204 or 20191204T124532
 * https://en.wikipedia.org/wiki/ISO_8601
 * @param date: string | Date
 * @param includeTime: boolean
 * @param includeMS?: boolean
 * @returns {string}
 */
function formatDateTime4Tag(date, includeTime, includeMS) {
  if (date === undefined || date === "" || date.toString() === "Invalid Date") {
    return "";
  }
  const d = new Date(date);
  let cDate = "" + d.getDate();
  cDate += "";
  if (cDate.length === 1) {
    cDate = "0" + cDate;
  }
  let cMonth = "" + (d.getMonth() + 1);
  cMonth += "";
  if (cMonth.length === 1) {
    cMonth = "0" + cMonth;
  }
  const cYear = d.getFullYear();
  let time = "";
  if (includeTime) {
    let cHour = "" + d.getHours();
    cHour += "";
    if (cHour.length === 1) {
      cHour = "0" + cHour;
    }
    let cMinute = "" + d.getMinutes();
    cMinute += "";
    if (cMinute.length === 1) {
      cMinute = "0" + cMinute;
    }
    let cSecond = "" + d.getSeconds();
    cSecond += "";
    if (cSecond.length === 1) {
      cSecond = "0" + cSecond;
    }
    time = "T" + cHour + "" + cMinute + "" + cSecond;
  }
  let milliseconds = "";
  if (includeMS) {
    milliseconds = "." + d.getMilliseconds();
  }
  return cYear + "" + cMonth + "" + cDate + time + milliseconds;
}

/**
 * @param dateString: string
 * @returns {boolean|Date}
 */
function convertStringToDate(dateString) {
  if (dateString === undefined || dateString === "") {
    return false;
  }
  if (dateString.length === 8) {
    return new Date(
      dateString.substring(0, 4) +
        "-" +
        dateString.substring(4, 6) +
        "-" +
        dateString.substring(6, 8)
    );
  }
  return false;
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number|number}
 */
function sortAlphaNum(a, b) {
  // Regular expression to separate the digit string from the non-digit strings.
  const reParts = /\d+|\D+/g;

  // Regular expression to test if the string has a digit.
  const reDigit = /\d/;

  // Get rid of casing issues && remove tags for files only (folders dont have tags in name)
  const cleanedA = a.isFile
    ? paths.cleanFileName(a.name.toLowerCase())
    : a.name.toLowerCase();
  const cleanedB = b.isFile
    ? paths.cleanFileName(b.name.toLowerCase())
    : b.name.toLowerCase();

  // Separates the strings into substrings that have only digits and those
  // that have no digits.
  const aParts = cleanedA.match(reParts);
  const bParts = cleanedB.match(reParts);

  // Used to determine if aPart and bPart are digits.
  let isDigitPart;

  // If `a` and `b` are strings with substring parts that match...
  if (
    aParts &&
    bParts &&
    (isDigitPart = reDigit.test(aParts[0])) === reDigit.test(bParts[0])
  ) {
    // Loop through each substring part to compare the overall strings.
    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i += 1) {
      let aPart = aParts[i];
      let bPart = bParts[i];
      // If comparing digits, convert them to numbers (assuming base 10).
      if (isDigitPart) {
        aPart = parseInt(aPart, 10);
        bPart = parseInt(bPart, 10);
      }

      // If the substrings aren't equal, return either -1 or 1.
      if (aPart !== bPart) {
        return aPart < bPart ? -1 : 1;
      }

      // Toggle the value of isDigitPart since the parts will alternate.
      isDigitPart = !isDigitPart;
    }
  }

  // Use normal comparison.
  // @ts-ignore
  return (a >= b) - (a <= b);
}

/**
 * Sorting functionality
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByName(a, b) {
  // @ts-ignore
  return !b.isFile - !a.isFile || sortAlphaNum(a, b);
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortBySize(a, b) {
  return a.size - b.size;
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByDateModified(a, b) {
  return a.lmdt - b.lmdt;
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByExtension(a, b) {
  return a.extension.toString().localeCompare(b.extension);
}

/**
 * @param a: TS.FileSystemEntry
 * @param b: TS.FileSystemEntry
 * @returns {number}
 */
function sortByFirstTag(a, b) {
  if ((!a.tags && !b.tags) || (a.tags.length < 1 && b.tags.length < 1)) {
    return 0;
  }
  if (!a.tags || a.tags.length < 1) {
    return -1;
  }
  if (!b.tags || b.tags.length < 1) {
    return 1;
  }
  return a.tags[0].title.localeCompare(b.tags[0].title);
}

/**
 * @param array: Array<any>
 * @returns {Array<*>}
 */
function shuffleArray(array) {
  // Durstenfeld shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * @param data: any
 * @param criteria: string
 * @param order: boolean
 * @returns {Array<*>|*}
 */
function sortByCriteria(data, criteria, order) {
  switch (criteria) {
    case "byName":
      if (order) {
        return data.sort(sortByName);
      }
      return data.sort((a, b) => -1 * sortByName(a, b));
    case "byFileSize":
      if (order) {
        return data.sort(sortBySize);
      }
      return data.sort((a, b) => -1 * sortBySize(a, b));
    case "byDateModified":
      if (order) {
        return data.sort(sortByDateModified);
      }
      return data.sort((a, b) => -1 * sortByDateModified(a, b));
    case "byExtension":
      if (order) {
        return data.sort(sortByExtension);
      }
      return data.sort((a, b) => -1 * sortByExtension(a, b));
    case "byFirstTag":
      if (order) {
        return data.sort(sortByFirstTag);
      }
      return data.sort((a, b) => -1 * sortByFirstTag(a, b));
    case "random":
      return shuffleArray(data);
    default:
      return data.sort(sortByName);
  }
}

/**
 * @description Check if value is of type 'object'
 * @param val
 * @returns {boolean}
 */
const isObj = (val) => typeof val === "object" && !isArr(val) && !isNull(val);
/**
 * @description Check if value is of type 'null'
 * @param val
 * @returns {boolean}
 */
const isNull = (val) => val === null;
/**
 * @description Check if value is of type 'number'
 * @param val
 * @returns {boolean}
 */
const isNum = (val) => typeof val === "number" && !isNaN(val);
/**
 * @description Check if value is of type 'function'
 * @param val
 * @returns {boolean}
 */
const isFunc = (val) => typeof val === "function";
/**
 * @description Check if value is of type 'array'
 * @param val
 * @returns {boolean}
 */
const isArr = (val) => Array.isArray(val);
/**
 * @description Check if value is of type 'string'
 * @param val
 * @returns {boolean}
 */
const isStr = (val) => typeof val === "string";
/**
 * Check if value is of type 'undefined'
 */
const isUndef = (val) => typeof val === "undefined";
/**
 * Check if value is of type 'boolean'
 */
const isBool = (val) => typeof val === "boolean";
/**
 * Check if object has property
 */
const hasProp = (obj, prop) => obj.hasOwnProperty(prop);
/**
 * Check if object has method
 */
const hasMethod = (obj, method) => hasProp(obj, method) && isFunc(obj[method]);
/**
 * Check if object has key
 */
const hasKey = (obj, key) => getKeys(obj).indexOf(key) > -1;
/**
 * @description Get object keys
 * @param obj
 * @returns {Array}
 */
const getKeys = (obj) => Object.keys(obj);
/**
 * @description Iterate over each key of an object
 * @param obj
 * @param callback
 */
const eachKey = (obj, callback) => {
  Object.keys(obj).forEach((key, index) => callback(key, obj[key], index));
};

/**
 * @description Linear iterator for object properties
 * @param obj
 * @param callback
 */
const eachProp = (obj, callback) => {
  eachKey(obj, (key, prop, index) => callback(prop, key, index));
};

/**
 * @description Extend
 * @param baseObject
 * @param restObjects
 * @returns {object}
 */
const extend = (baseObject, ...restObjects) => {
  const { assign } = Object;
  const modifiedObject = assign({}, baseObject);
  restObjects.map((obj) => assign(modifiedObject, obj));
  return modifiedObject;
};

/**
 * @description Iterate recursively
 * @param handler
 * @param complete
 * @param index
 * @returns {*}
 */
const recurIter = (handler, complete, index = 0) => {
  handler((canRecur) => {
    if (!canRecur) {
      return complete();
    }
    const nextIndex = index + 1;
    recurIter(handler, complete, nextIndex);
  }, index);
};

/**
 * @description Poll over an interval of time
 * @param handler
 * @param complete
 * @param interval
 */
const poll = (handler, complete, interval) => {
  setTimeout(() => {
    handler((canPoll) => {
      if (canPoll) {
        return poll(handler, complete, interval);
      }
      complete();
    });
  }, interval);
};

/**
 * @description Buffer high-frequency events
 * @returns {function(*=, *=, *=)}
 */
const buffer = ({ timeout, id }) => {
  const timers = {};
  return (callback) => {
    if (!id) {
      timers[id] = "0";
    }
    if (timers[id]) {
      clearTimeout(timers[id]);
    }
    timers[id] = setTimeout(callback, timeout);
  };
};

/**
 * @description Determine type checker
 * @param type
 * @returns {*}
 */
const determineTypeChecker = (type) => {
  switch (type) {
    case "number":
      return isNum;
    case "object":
      return isObj;
    case "null":
      return isNull;
    case "function":
      return isFunc;
    case "array":
      return isArr;
    case "string":
      return isStr;
    case "bool":
    case "boolean":
      return isBool;
    case "undefined":
    default:
      return isUndef;
  }
};

/**
 * @description Filter object data
 * @param objectData
 * @param requiredKeys
 */
const filterObjectData = (objectData, requiredKeys) => {
  const filteredObject = {};
  eachKey(objectData, (key, value) => {
    if (requiredKeys.indexOf(key) === -1) {
      return false;
    }
    filteredObject[key] = value;
  });
  return filteredObject;
};

/**
 * @description Filter array of objects data
 * @param arrayData
 * @param requiredKeys
 */
const filterArrayOfObjectsData = (arrayData, requiredKeys) =>
  arrayData.reduce((accumulator, item) => {
    const filteredObject = filterObjectData(item, requiredKeys);
    accumulator.push(filteredObject);
    return accumulator;
  }, []);

/**
 * @description Pluck object data to array
 * @param objectData
 * @param requiredKey
 */
const pluckObjectDataToArray = (objectData, requiredKey) => {
  const filteredArray = [];
  eachKey(objectData, (key, value) => {
    if (requiredKey !== key) {
      return false;
    }
    filteredArray.push(value);
  });
  return filteredArray;
};

/**
 * @description Pluck array of objects data to array
 * @param arrayData
 * @param requiredKey
 */
const pluckArrayOfObjectsDataToArray = (arrayData, requiredKey) =>
  arrayData.reduce((accumulator, item) => {
    const filteredArray = pluckObjectDataToArray(item, requiredKey);
    return [...accumulator, ...filteredArray];
  }, []);

/**
 * @description Extract nexted prop
 * @param obj
 * @param keysText
 * @returns {*}
 */
const extractNestedProp = (obj, keysText) => {
  const keys = keysText.split(".");
  const keysLength = keys.length - 1;
  let keysIndex = 0;
  let isValidKey = true;
  let targetObj = Object.assign({}, obj);
  let targetProp;
  let nextTarget;

  if (keys.length > 0) {
    while (isValidKey) {
      nextTarget = targetObj[keys[keysIndex]];

      // ... check if final target is reached ...
      if (keysIndex === keysLength) {
        // ... extract target prop
        targetProp =
          !isUndef(nextTarget) && !isNull(nextTarget) ? nextTarget : undefined;
        break;
      }

      // ... check if next target is not an object ...
      if (!isObj(nextTarget)) {
        // ... cancel sequence
        isValidKey = false;
        break;
      }

      targetObj = nextTarget;
      keysIndex++;
    }
  }

  return targetProp;
};

/**
 * @description Sort by
 * @param items
 * @param keysText
 * @param type
 * @param direction
 */
const sortBy = (items, keysText, type = "string", direction = "asc") =>
  items.sort((a, b) => {
    const aVal = extractNestedProp(a, keysText);
    const bVal = extractNestedProp(b, keysText);
    if (isUndef(aVal) || isNull(aVal)) {
      return direction === "asc" ? -1 : 1;
    }

    if (isUndef(bVal) || isNull(bVal)) {
      return direction === "asc" ? 1 : -1;
    }
    if (type === "string" || type === "email") {
      if (aVal.toLowerCase() > bVal.toLowerCase()) {
        return direction === "asc" ? 1 : -1;
      }
      if (aVal.toLowerCase() < bVal.toLowerCase()) {
        return direction === "asc" ? -1 : 1;
      }
      return 0;
    }
    if (type === "number" || type === "integer" || type === "float") {
      if (aVal > bVal) {
        return direction === "asc" ? 1 : -1;
      }
      if (aVal < bVal) {
        return direction === "asc" ? -1 : 1;
      }
      return 0;
    }
    if (type === "date") {
      // @ts-ignore
      const res1 = new Date(aVal) - new Date(bVal);
      // @ts-ignore
      const res2 = new Date(bVal) - new Date(aVal);
      return direction === "asc" ? res1 : res2;
    }
  });

/**
 * @description Shape
 * @param items
 * @returns {*}
 */
const shape = (items) => {
  let shapeItems = [...items];

  return {
    fetch: () => shapeItems,
    filterByUnique(key) {
      shapeItems = filterByUnique(shapeItems, key);
      return this;
    },
    filterByDuplicate(key, length = 2) {
      shapeItems = filterByDuplicate(shapeItems, key, length);
      return this;
    },
    sortBy({ key, type = "string", direction = "asc" }) {
      shapeItems = sortBy(shapeItems, key, type, direction);
      return this;
    },
    reduceTo(key) {
      shapeItems = shapeItems.reduce((accumulator, item) => {
        const prop = extractNestedProp(item, key);
        if (isArr(prop)) {
          return [...accumulator, ...prop];
        }
        if (!isUndef(prop) && !isNull(prop)) {
          return [...accumulator, prop];
        }
      }, []);
      return this;
    },
  };
};

/**
 * @description Filter by unique
 * @param items
 * @param key
 * @returns {*}
 */
const filterByUnique = (items, key) =>
  items.reduce((accumulator, item) => {
    const itemProp = extractNestedProp(item, key);
    const isDuplicate =
      accumulator.filter((filteredItem) => {
        const prop = extractNestedProp(filteredItem, key);
        return prop === itemProp;
      }).length > 0;

    if (isDuplicate) {
      return accumulator;
    }

    const modifiedItem = extend({}, item);
    accumulator.push(modifiedItem);
    return accumulator;
  }, []);

/**
 * @description Filter by duplicate
 * @param items
 * @param key
 * @param duplicateLength
 * @returns {*}
 */
const filterByDuplicate = (items, key, duplicateLength = 2) =>
  items.filter((item) => {
    const itemProp = extractNestedProp(item, key);
    const duplicatesCount = duplicateLength - 1;
    return (
      items.filter((innerItem) => {
        const prop = extractNestedProp(innerItem, key);
        return prop === itemProp;
      }).length > duplicatesCount
    );
  });

module.exports = {
  locationType,
  prepareTagGroupForExport,
  prepareTagForExport,
  escapeRegExp,
  parseTextQuery,
  removeAllTagsFromSearchQuery,
  mergeWithExtractedTags,
  traverse,
  immutablySwapItems,
  b64toBlob,
  getRandomInt,
  arrayBufferToBuffer,
  formatFileSize,
  formatFileSize2,
  formatDateTime,
  formatDateTime4Tag,
  convertStringToDate,
  sortAlphaNum,
  sortByName,
  sortBySize,
  sortByDateModified,
  sortByExtension,
  sortByFirstTag,
  shuffleArray,
  sortByCriteria,
  isObj,
  isNull,
  isNum,
  isFunc,
  isArr,
  isStr,
  isUndef,
  isBool,
  hasProp,
  hasMethod,
  hasKey,
  getKeys,
  eachKey,
  eachProp,
  extend,
  recurIter,
  poll,
  buffer,
  determineTypeChecker,
  filterObjectData,
  filterArrayOfObjectsData,
  pluckObjectDataToArray,
  pluckArrayOfObjectsDataToArray,
  extractNestedProp,
  sortBy,
  shape,
  filterByUnique,
  filterByDuplicate,
};
