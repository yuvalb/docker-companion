# docker-companion 🐳🐕

`docker-companion` is a node package for asynchronously managing lifecycle and execution of docker containers.

# Prerequisites

You must have the following installed to run `docker-companion`:

- node 16 or higher
- docker

Additionally, typescript users can utilise the built-in typings.

#### Install

```sh
npm i docker-companion
```

# Quick Start

### Definitions

```ts
import { build } from "docker-companion";
import { resolve } from "path";
import { readFileSync } from "fs";

const TempDir = resolve("temp");
```

### Build and start a container

```ts
const container = await build({
  image: "alpine:3.14.0",
  runOpts: ["-it"],
  volumes: [[TempDir, "/usr/local/tmp"]],
}).start();
```

### Execute a command

```ts
const { out } = await container.execute(["echo", "hello"]);

console.log(out); // "hello"
```

### Oops, error!

```ts
const { err } = await container.execute(["ls", "nothing"]);

console.log(err); // "ls: nothing: No such file or directory"
```

### Write to shared volume

```ts
await container.execute([
  "sh",
  "-c",
  `echo -e -n hello > /usr/local/tmp/hello.txt`,
]);

const localFile = resolve(TempDir, "hello.txt");
const content = readFileSync(localFile);

console.log(content); // "hello"
```

### Stop the container

```ts
await container.stop();
```

# Contributors

- [ron-aharoni](https://github.com/ron-aharoni) 🦆
- [yuvalb](https://github.com/yuvalb) 🦜

( We welcome contributions 😃🎉 )
