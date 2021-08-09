import { spawn } from "child_process";
import { Readable } from "stream";

export type ExecutionResult = {
  out: string;
  err: string;
};

export async function verifyExistsImage(image: string): Promise<boolean> {
  const imageExists = await existsImage(image);
  const shouldPull = !imageExists;

  if (shouldPull) {
    await pullImage(image);
  }

  return shouldPull;
}

export async function existsImage(image: string): Promise<boolean> {
  const { out, err } = await executeDocker("image", "inspect", image);

  return !err && !!out;
}

export async function pullImage(image: string): Promise<void> {
  const { err } = await executeDocker("pull", image);

  if (err) {
    throw new Error(
      `Could not pull docker image '${image}' due to error: ${err}`
    );
  }
}

export async function removeImage(image: string): Promise<void> {
  const { err } = await executeDocker("image", "rm", image);

  if (err) {
    throw new Error(
      `Could not remove docker image '${image}' due to error: ${err}`
    );
  }
}

export async function executeDocker(
  ...args: string[]
): Promise<ExecutionResult> {
  const { stdout, stderr } = spawn("docker", args);

  const [out$, err$] = [stdout, stderr].map(readableToString);
  const [out, err] = await Promise.all([out$, err$]);

  const containerNotRunning = err.match(
    /^Error response from daemon: Container (?<containerId>[\w]+) is not running*/
  );

  if (containerNotRunning) {
    const id = containerNotRunning?.groups?.containerId;
    throw new Error(`Could not execute in container ${id} with error: ${err}`);
  }

  return { out, err };
}

async function readableToString(readable: Readable): Promise<string> {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}
