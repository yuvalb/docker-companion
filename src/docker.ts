import { spawn } from "child_process";
import { Readable } from "stream";

export type ExecutionResult = {
  out: string;
  err: string;
};

export async function verifyExistsImage(image: string): Promise<boolean> {
  const shouldPull = !(await existsImage(image));

  if (shouldPull) {
    await pullImage(image);
  }

  return shouldPull;
}

export async function existsImage(image: string): Promise<boolean> {
  const args = ["image", "inspect", image];

  const { out, err } = await executeDocker(args);

  return !err && !!out;
}

export async function pullImage(image: string): Promise<void> {
  const args = ["pull", image];
  const { err } = await executeDocker(args);

  if (err) {
    throw new Error(`Could not pull docker image '${image}' due to error: ${err}`);
  }
  return;
}

export async function removeImage(image: string): Promise<void> {
  const args = ["image", "rm", image];
  const { err } = await executeDocker(args);

  if (err) {
    throw new Error(`Could not remove docker image '${image}' due to error: ${err}`);
  }
  return;
}

export async function executeDocker(args: string[]): Promise<ExecutionResult> {
  const { stdout, stderr } = spawn("docker", args);

  const out$ = readableToString(stdout);
  const err$ = readableToString(stderr);

  const [out, err] = await Promise.all([out$, err$]);
  return { out, err };
}

export async function readableToString(readable: Readable): Promise<string> {
  const chunks = [];

  for await (let chunk of readable) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}
