import { PathLike } from "fs";
import { executeDocker, ExecutionResult, verifyExistsImage } from "./docker";

export type BuildArgs = {
  volumes?: Array<[source: PathLike, target: PathLike]>;
  ports?: Array<[source: number, target: number]>;
  entryPoint?: string;
  runOpts?: string[];
  image: string;
};

export const build = (args: BuildArgs) => new DockerContainer(args);

export class DockerContainer {
  constructor(private readonly args: BuildArgs) {}

  async start(): Promise<RunnableContainer> {
    const image = this.args.image;
    
    await verifyExistsImage(image);

    const opts = this.extractRunOpts(this.args);
    const args = ["run", ...opts, "-d", image];

    const { out, err } = await executeDocker(args);

    if (err) {
      throw new Error(`Could not start container with error: ${err}`);
    }

    return new RunnableContainer(out.trim());
  }

  private extractRunOpts(args: BuildArgs): string[] {
    const runOpts = args.runOpts ?? [];
    
    const volumes = args.volumes ?? [];
    const volOpts = Array.prototype.concat.apply([], volumes.map(([s,t]) => [`--mount`,`type=bind,src=${s},dst=${t}`]))

    return [
      ...runOpts,
      ...volOpts
    ]
  }
}

export class RunnableContainer {
  constructor(readonly id: string) {}

  async execute(command: Array<string>): Promise<ExecutionResult> {
    const args = ["exec", this.id].concat(command);

    const { out, err } = await executeDocker(args);

    if (
      err.startsWith(
        `Error response from daemon: Container ${this.id} is not running`
      )
    ) {
      throw new Error(`Could not execute in container with error: ${err}`);
    }

    return { out, err };
  }

  async stop(): Promise<void> {
    const args = ["stop", this.id];

    const { err } = await executeDocker(args);

    if (err) {
      if (err.includes(`Container ${this.id} is not running`)) {
        return;
      } else {
        throw new Error(`Could not stop container with error: ${err}`);
      }
    }
  }
}
