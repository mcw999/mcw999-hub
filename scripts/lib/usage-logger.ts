import fs from "fs/promises";
import path from "path";
import { CONTENT_DIR } from "./config";

const TODAY = new Date().toISOString().split("T")[0];
const USAGE_PATH = path.join(CONTENT_DIR, "meta", "api-usage.json");

interface UsageEntry {
  date: string;
  platform: string;
  purpose: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface UsageData {
  entries: UsageEntry[];
}

export async function logUsage(
  platform: string,
  purpose: string,
  model: string,
  usage: { input_tokens: number; output_tokens: number }
): Promise<void> {
  let data: UsageData;
  try {
    const raw = await fs.readFile(USAGE_PATH, "utf-8");
    data = JSON.parse(raw);
  } catch {
    data = { entries: [] };
  }

  data.entries.push({
    date: TODAY,
    platform,
    purpose,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  });

  await fs.mkdir(path.dirname(USAGE_PATH), { recursive: true });
  await fs.writeFile(USAGE_PATH, JSON.stringify(data, null, 2), "utf-8");
}
