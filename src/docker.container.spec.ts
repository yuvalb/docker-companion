import * as assert from "assert";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { build, RunnableContainer } from "./docker.container";
import { normalizeVoid } from "./docker.spec";

describe("docker container", () => {
  const args = {
    image: "alpine:3.14.0",
    runOpts: ["-it"],
  };

  describe("start", () => {
    let container: RunnableContainer;

    before(async () => {
      container = await build(args).start();
    });

    after(async () => {
      container?.stop();
    });

    it("can start container", async () => {
      assert.notEqual(container.id.length, 0, "started container has no id");
    });

    describe("volumes", () => {
      let volumeContainer: RunnableContainer;

      const TempDir = resolve(process.cwd(), "temp");
      const HostDir = "/usr/local/tmp";
      const HostDir2 = `${HostDir}2`;

      before(async () => {
        mkdirSync(TempDir, { recursive: true });
        volumeContainer = await build({
          ...args,
          volumes: [[TempDir, HostDir]],
        }).start();
      });

      after(async () => {
        await volumeContainer?.stop();
        rmSync(TempDir, { recursive: true });
      });

      async function testWrite(container: RunnableContainer, hostDir: string) {
        const filename = `${randomBytes(4).toString("hex")}.txt`;
        const hostFilepath = `${hostDir}/${filename}`;
        const data = `${randomBytes(4).toString("hex")}`;
        const cmd = ["sh", "-c", `echo -e -n ${data} > ${hostFilepath}`];

        const { out, err } = await container.execute(cmd);
        console.log(out);
        assert.equal(!!err, false, `failed writing to volume with error: ${err}`);

        const localFilepath = resolve(TempDir, filename);
        const fileExists = existsSync(localFilepath);
        assert.equal(fileExists, true, "created file does not exist");
        const fileData = readFileSync(localFilepath);
        assert.equal(fileData, data, "file content doesn't match input");
      }

      async function testRead(container: RunnableContainer, hostDir: string) {
        const filename = `${randomBytes(4).toString("hex")}.txt`;
        const filepath = resolve(TempDir, filename);
        const data = `${randomBytes(4).toString("hex")}`;

        writeFileSync(filepath, data);

        const { out, err } = await container.execute([
          "cat",
          `${hostDir}/${filename}`,
        ]);

        assert.equal(
          !!err,
          false,
          `failed reading file from host with error: ${err}`
        );
        assert.equal(out, data, "file contents do not match host");
      }

      it("should write to a volume", async () =>
        testWrite(volumeContainer, HostDir));

      it("should read from a volume", async () =>
        testRead(volumeContainer, HostDir));

      describe("multiple", () => {
        let multipleVolumeContainer: RunnableContainer;

        before(async () => {
          mkdirSync(TempDir, { recursive: true });
          multipleVolumeContainer = await build({
            ...args,
            volumes: [
              [TempDir, HostDir],
              [TempDir, HostDir2],
            ],
          }).start();
        });

        after(() => multipleVolumeContainer?.stop());

        it("should correctly write to multiple volumes", async () =>
          Promise.all([
            testWrite(multipleVolumeContainer, HostDir),
            testWrite(multipleVolumeContainer, HostDir2),
          ]));
        it("should correctly read from multiple volumes", async () =>
          Promise.all([
            testRead(multipleVolumeContainer, HostDir),
            testRead(multipleVolumeContainer, HostDir2),
          ]));
      });

      describe("errors", () => {
        it("should reject if volume cannot be mounted", async () => {
          const nonExistentDir = randomBytes(4).toString("hex");

          const result = await build({
            ...args,
            volumes: [[nonExistentDir, HostDir]],
          })
            .start()
            .then(...normalizeVoid);

          assert.equal(
            result,
            false,
            "no error was thrown when mounting nonexistent dir"
          );
        });
      });
    });
  });

  describe("exec", () => {
    let container: RunnableContainer;

    before(async () => {
      container = await build(args).start();
    });

    after(async () => {
      container?.stop();
    });

    it("can exec command", async () => {
      const { out, err } = await container.execute(["echo", "bla"]);
      assert.equal(err, "");
      assert.equal(out, "bla\n");
    });

    it("reports stderr", async () => {
      const { out, err } = await container.execute(["ls", "nothing"]);

      assert.equal(!!err, true, "stderr was not read");
      assert.equal(!!out, false, "stdout was not empty");
    });
  });

  describe("stop", () => {
    let container: RunnableContainer;

    before(async () => {
      container = await build(args).start();
    });

    after(async () => {
      container?.stop();
    });

    it("can stop container", async () => {
      container = await build(args).start();
      await container.stop();

      const executionSuccess = await container
        .execute(["echo", "bla"])
        .then(...normalizeVoid);

      assert.equal(
        executionSuccess,
        false,
        "It didn't fail executing a command after container was stopped"
      );
    });
  });
});
