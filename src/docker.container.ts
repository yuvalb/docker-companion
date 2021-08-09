import { PathLike } from "fs";
import { executeDocker, ExecutionResult, verifyExistsImage } from "./docker";

export type BuildArgs = {
  volumes?: Array<[source: PathLike, target: PathLike]>;
  ports?: Array<[source: number, target: number]>;
  entryPoint?: string;
  runOpts?: string[];
  image: string;
};

export const build = (args: BuildArgs) => new RunnableContainer(args);

export class RunnableContainer {
  constructor(private readonly args: BuildArgs) {}

  async start(): Promise<DockerContainer> {
    const image = this.args.image;

    await verifyExistsImage(image);

    const opts = this.extractRunOpts(this.args);

    const { out, err } = await executeDocker("run", ...opts, "-d", image);

    if (err) {
      throw new Error(`Could not start container with error: ${err}`);
    }

    const containerId = out.trim();
    return new DockerContainer(containerId);
  }

  private extractRunOpts(args: BuildArgs): string[] {
    const runOpts = args.runOpts ?? [];

    const volumes = args.volumes ?? [];
    const volOpts = volumes
      .map(([s, t]) => [`--mount`, `type=bind,src=${s},dst=${t}`])
      .reduce((prev, curr) => [...prev, ...curr], []);

    return [...runOpts, ...volOpts];
  }
}

export class DockerContainer {
  constructor(readonly id: string) {}

  execute(command: Array<string>): Promise<ExecutionResult> {
    return executeDocker("exec", this.id, ...command);
  }

  async stop(): Promise<void> {
    await executeDocker("stop", this.id);
  }
}
