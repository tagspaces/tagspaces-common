const fs = require("fs");
const os = require("os");
const pathLib = require("path");
const { EventEmitter } = require("events");
const { createIpcServer } = require("../ipc");

// A valid 16x16 RGB PNG, so thumbnail generation actually produces a result.
const PNG_16x16_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABlElEQVR4nBWRURFEMQjEkFAJSKgEJFQCEiohEiqhEpCAhEpAAhLuHt87THYjIgxBhSmYsAQXtoBwhCuEkMITSmhBZDAGOpgDG6yBD/aAwRncQQxy8AY16IGIMhRVpmLKUlzZCspRrhJKKk8ppRWRyZjoZE5ssiY+2RMmZ3InMcnJm9SkJyLGMNSYhhnLcGMbGMe4RhhpPKOMNkQWY6GLubDFWvhiL1icxV3EIhdvUYteiDjDUWc65izHne3gHOc64aTznHLaEdmMjW7mxjZr45u9YXM2dxOb3LxNbXoj8g2IfiWxDwT/wt8duBCQ8KCg/3rkMA56mAc7rIMf9vni53APccjDO9Shz9/DZVz0Mi92WRe/7Ps9P5d7iUte3qUuff8eghFoMAMLVuDBjg/lBDeIIIMXVNDx95CMRJOZWLIST3Z+4Ce5SSSZvKSSzr+Hx3joYz7ssR7+2O+reR73EY98vEc9+v09FKPQYhZWrMKLXd8op7hFFFm8ooquv4dmNNrMxprVeLP7m/A0t4kmm9dU080PiAJwEDqK72wAAAAASUVORK5CYII=";

/**
 * Stand-in for the Electron utilityProcess message port pair.
 *
 * The worker side mirrors `process.parentPort` (a 'message' event carrying a
 * MessageEvent with `.data`, plus postMessage); the main side mirrors what
 * `utilityProcess.fork()` returns (a 'message' event carrying the data
 * directly, plus postMessage).
 */
function makePortPair() {
  const inbound = new EventEmitter();
  const outbound = new EventEmitter();
  const workerPort = {
    on: (event, fn) => inbound.on(event, fn),
    postMessage: (m) => outbound.emit("message", m),
  };
  const main = {
    postMessage: (m) => inbound.emit("message", { data: m }),
    on: (event, fn) => outbound.on(event, fn),
    off: (event, fn) => outbound.off(event, fn),
  };
  return { workerPort, main };
}

describe("IPC transport", () => {
  let main;
  let nextId;

  beforeEach(() => {
    const pair = makePortPair();
    main = pair.main;
    nextId = 1;
    createIpcServer(pair.workerPort);
  });

  /** Send a request and resolve with the worker's reply for that id. */
  function call(op, params, { cancelImmediately = false } = {}) {
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no reply for ${op}`)),
        20000,
      );
      const onMessage = (msg) => {
        if (msg && msg.id === id) {
          clearTimeout(timer);
          main.off("message", onMessage);
          resolve(msg);
        }
      };
      main.on("message", onMessage);
      main.postMessage({ id, op, params });
      if (cancelImmediately) {
        // Dispatched synchronously in the same tick, so the operation's signal
        // is already aborted the first time the directory walk checks it.
        main.postMessage({ op: "cancel", target: id });
      }
    });
  }

  function makeTempDir(fileCount) {
    const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "ws-ipc-"));
    for (let i = 0; i < fileCount; i += 1) {
      fs.writeFileSync(pathLib.join(dir, `file${i}.txt`), `content ${i}`);
    }
    return dir;
  }

  test("ping confirms the message loop, not just the process", async () => {
    const reply = await call("ping");
    expect(reply.ok).toBe(true);
    expect(reply.result).toBe(true);
  });

  test("indexer runs and writes the index", async () => {
    const dir = makeTempDir(3);
    try {
      const reply = await call("indexer", {
        directoryPath: dir,
        extractText: true,
        forceFullReindex: true,
      });
      expect(reply.ok).toBe(true);
      // persistIndex resolves to the written tsi.json file entry, so `success`
      // is a truthy object rather than a boolean — this is the shape the
      // renderer already checks with `result && result.success`.
      expect(reply.result.success).toBeTruthy();

      const index = JSON.parse(
        fs.readFileSync(pathLib.join(dir, ".ts", "tsi.json"), "utf8").trim(),
      );
      expect(index.map((e) => e.name).sort()).toEqual([
        "file0.txt",
        "file1.txt",
        "file2.txt",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("thumbGen returns an array for files with no thumbnail", async () => {
    const dir = makeTempDir(1);
    try {
      const reply = await call("thumbGen", {
        paths: [pathLib.join(dir, "file0.txt")],
      });
      expect(reply.ok).toBe(true);
      expect(Array.isArray(reply.result)).toBe(true);
      expect(reply.result).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("a real thumbnail result survives the message port", async () => {
    // Unlike JSON, structured clone refuses non-cloneable values, so the real
    // thumbnail payload has to cross the port in a test -- a .txt produces an
    // empty array and would not exercise it.
    const dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), "ws-ipc-png-"));
    const imagePath = pathLib.join(dir, "pic.png");
    fs.writeFileSync(imagePath, Buffer.from(PNG_16x16_BASE64, "base64"));
    try {
      const reply = await call("thumbGen", { paths: [imagePath] });
      expect(reply.ok).toBe(true);
      expect(reply.result).toHaveLength(1);
      expect(reply.result[0].filePath).toContain("pic.png");
      expect(reply.result[0].tmbPath).toContain("pic.png.jpg");
      expect(fs.existsSync(pathLib.join(dir, ".ts", "pic.png.jpg"))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  test("cancel reaches the running operation and stops the walk", async () => {
    const dir = makeTempDir(40);
    try {
      const reply = await call(
        "indexer",
        { directoryPath: dir, forceFullReindex: true },
        { cancelImmediately: true },
      );
      expect(reply.ok).toBe(true);
      // The walk saw an aborted signal before it got through the directory, so
      // the index must be short of the 40 files on disk.
      const index = JSON.parse(
        fs.readFileSync(pathLib.join(dir, ".ts", "tsi.json"), "utf8").trim(),
      );
      expect(index.length).toBeLessThan(40);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);

  test("cancelling an unknown id is a no-op", async () => {
    main.postMessage({ op: "cancel", target: 9999 });
    // The server must still be healthy afterwards.
    const reply = await call("ping");
    expect(reply.ok).toBe(true);
  });

  test("unknown op is refused", async () => {
    const reply = await call("rmrf", { path: "/" });
    expect(reply.ok).toBe(false);
    expect(reply.error).toBe("unknown op");
  });

  test.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "inherited Object property %s is not callable as an op",
    async (op) => {
      const reply = await call(op, {});
      expect(reply.ok).toBe(false);
      expect(reply.error).toBe("unknown op");
    },
  );

  test("operation errors come back as a failure, not a crash", async () => {
    const reply = await call("indexer", { directoryPath: "relative/path" });
    expect(reply.ok).toBe(false);
    expect(reply.error).toMatch(/absolute/i);
  });

  test.each([
    ["null", null],
    ["a string", "hello"],
    ["a request with no id", { op: "ping" }],
    ["a request with an object id", { id: {}, op: "ping" }],
  ])("malformed message (%s) is ignored", async (_label, payload) => {
    main.postMessage(payload);
    const reply = await call("ping");
    expect(reply.ok).toBe(true);
  });
});
