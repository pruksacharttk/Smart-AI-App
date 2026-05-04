export interface SseMessage<T = unknown> {
  event: string;
  data: T;
}

export function parseSseChunk(chunk: string): SseMessage[] {
  return chunk
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
      const dataLines = [...block.matchAll(/^data:\s*(.*)$/gm)].map((match) => match[1]);
      const raw = dataLines.join("\n") || "{}";
      try {
        return { event, data: JSON.parse(raw) };
      } catch {
        return { event, data: raw };
      }
    });
}

export async function readSseStream<TStatus, TResult>(
  response: Response,
  onStatus: (status: TStatus) => void
): Promise<TResult> {
  if (!response.body) {
    throw new Error("Streaming response is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parts = buffer.split(/\n\n+/);
    buffer = done ? "" : parts.pop() || "";

    for (const message of parts.flatMap(parseSseChunk)) {
      if (message.event === "status") {
        onStatus(message.data as TStatus);
      } else if (message.event === "result") {
        return message.data as TResult;
      } else if (message.event === "error") {
        const data = message.data as { error?: string };
        throw new Error(data?.error || "Skill run failed.");
      }
    }

    if (done) break;
  }

  for (const message of parseSseChunk(buffer)) {
    if (message.event === "result") return message.data as TResult;
    if (message.event === "status") onStatus(message.data as TStatus);
  }

  throw new Error("Skill run ended without a result.");
}
