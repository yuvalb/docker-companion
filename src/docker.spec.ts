import * as assert from "assert";
import { randomBytes } from "crypto";
import {
  existsImage,
  pullImage,
  removeImage,
  verifyExistsImage,
} from "./docker";

export const normalizeVoid = [() => true, () => false];

describe("docker", () => {
  const nonExistentImage = randomBytes(4).toString("hex");

  describe("pullImage", () => {
    const image = "alpine:3.13";

    after(() => {
      removeImage(image);
    });

    it("should pull an image", async () => {
      const result = await pullImage(image).then(...normalizeVoid);
      const exists = await existsImage(image);

      assert.equal(result, true, "it failed to pull an image");
      assert.equal(exists, true, "a pulled image doesn't exist");
    });

    describe("errors", () => {
      it("should throw an error if image cannot be pulled", async () => {
        let e;
        try {
          await pullImage(nonExistentImage);
        } catch (err) {
          e = err;
        }

        assert.notEqual(e, undefined, "Didn't throw");
      });
    });
  });

  describe("remove image", () => {
    const image = "alpine:3.10";

    after(() => {
      removeImage(image);
    });

    it("should remove an image", async () => {
      await pullImage(image);
      const success = await removeImage(image).then(...normalizeVoid);
      const exists = await existsImage(image);

      assert.equal(
        success,
        true,
        "it return false when removing an existing image"
      );
      assert.equal(exists, false, "a removed image still exists");
    });

    describe("errors", () => {
      it("should reject if image does not exist", async () => {
        const success = await removeImage(nonExistentImage).then(
          ...normalizeVoid
        );

        assert.equal(
          success,
          false,
          "it didn't fail removing non existent image"
        );
      });
    });
  });

  describe("existsImage", () => {
    const image = "alpine:3.14";

    after(() => {
      removeImage(image);
    });

    it("should return true if image exists", async () => {
      await pullImage(image);
      const result = await existsImage(image);

      assert.equal(result, true, "it returned false on existing image");
    });

    it("should return false if image exists", async () => {
      const result = await existsImage(nonExistentImage);
      assert.equal(result, false, "it returned true on non existent image");
    });
  });

  describe("verifyImage", () => {
    const pulledImage = "alpine:3.12";
    const unpulledImage = "alpine:3.11";

    after(() => {
      removeImage(unpulledImage);
      removeImage(pulledImage);
    });

    it("should pull a nonexistent image", async () => {
      const image = unpulledImage;
      await removeImage(image).then(...normalizeVoid);
      const result = await verifyExistsImage(image);
      const exists = await existsImage(image);

      assert.equal(result, true, "it did not report successful pull");
      assert.equal(exists, true, "image does not exist after verification");
    });

    it("should not do anything if image exists", async () => {
      const image = pulledImage;
      await pullImage(image);
      const pulled = await verifyExistsImage(image);

      assert.equal(
        pulled,
        false,
        "it reported pulling an image while it pre-existed"
      );
    });

    describe("errors", () => {
      it("should reject if pulling image failed", async () => {
        const result = await verifyExistsImage(nonExistentImage).then(
          ...normalizeVoid
        );

        assert.equal(
          result,
          false,
          "it did not reject when pulling image has rejected"
        );
      });
    });
  });
});
