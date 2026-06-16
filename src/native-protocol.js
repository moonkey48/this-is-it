import { once } from "node:events";

export async function readNativeMessage(input = process.stdin) {
  const header = input.read(4) || (await once(input, "readable").then(() => input.read(4)));
  if (!header || header.length < 4) return null;

  const length = header.readUInt32LE(0);
  if (length <= 0 || length > 1_000_000) {
    throw new Error(`Invalid native message length: ${length}`);
  }

  let body = input.read(length);
  while (!body || body.length < length) {
    await once(input, "readable");
    const chunk = input.read(length - (body?.length || 0));
    body = body ? Buffer.concat([body, chunk || Buffer.alloc(0)]) : chunk;
  }

  return JSON.parse(body.toString("utf8"));
}

export function writeNativeMessage(message, output = process.stdout) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  output.write(Buffer.concat([header, body]));
}
