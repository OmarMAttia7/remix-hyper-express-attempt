import {
  createReadableStreamFromReadable,
  createRequestHandler as createRemixRequestHandler,
} from "@remix-run/node";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import * as HyperExpress from "hyper-express";
import { Readable } from "node:stream";
import { access, stat } from "fs/promises";
import { join } from "path";

const app = new HyperExpress.Server();

// @ts-ignore
const build = (await import("./build/server/index.js")) as ServerBuild;

type GetLoadContextFunction = (
  request: HyperExpress.Request,
  response: HyperExpress.Response
) => Promise<AppLoadContext> | AppLoadContext;

type RequestHandler<
  RequestLocals = HyperExpress.DefaultRequestLocals,
  ResponseLocals = HyperExpress.DefaultResponseLocals
> = (
  request: HyperExpress.Request<RequestLocals>,
  response: HyperExpress.Response<ResponseLocals>
) => Promise<void>;

function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return (async (req, res) => {
    const webRequest = toWebRequest(req, res);
    const loadContext = await getLoadContext?.(req, res);

    const webResponse = await handleRequest(webRequest, loadContext);

    await sendWebResponse(res, webResponse);
  }) satisfies RequestHandler;
}

const toWebRequest = (
  request: HyperExpress.Request,
  response: HyperExpress.Response
): Request => {
  const url = `${request.protocol}://${request.hostname}${request.originalUrl}`;

  const abortController = new AbortController();
  response.on("close", () => abortController.abort());

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
    signal: abortController.signal,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(request);
    init.duplex = "half";
  }

  return new Request(url, init);
};

const sendWebResponse = async (
  response: HyperExpress.Response,
  webResponse: Response
) => {
  response.status(webResponse.status);

  for (const [key, values] of webResponse.headers.entries()) {
    response.setHeader(key, values);
  }

  if (webResponse.body) {
    const stream = responseToReadable(webResponse.clone());
    return response.stream(stream);
  }

  return response.send(await webResponse.text());
};

function responseToReadable(response: Response): Readable {
  const reader = response.body!.getReader();
  const readable = new Readable();
  readable._read = async () => {
    const result = await reader.read();
    if (!result.done) {
      readable.push(Buffer.from(result.value));
    } else {
      readable.push(null);
      return;
    }
  };

  return readable;
}

app.use(build.publicPath, async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return;
  }

  const filePath = join(build.assetsBuildDirectory, req.path);

  const fileExists = await access(filePath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    return;
  }

  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    return;
  }

  return res.sendFile(filePath);
});

app.use(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return;
  }

  const filePath = join("public", req.path);

  const fileExists = await access(filePath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    return;
  }

  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    return;
  }

  return res.sendFile(filePath);
});

app.all(
  "*",
  createRequestHandler({
    build,
    getLoadContext: async () => ({
      env: {
        NODE_ENV: process.env.NODE_ENV,
      },
    }),
  })
);

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
