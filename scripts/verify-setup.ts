/**
 * verify-setup.ts
 * すべての認証情報が正しく設定されているか検証する。
 * アカウント作成後、最初に実行するスクリプト。
 */
import Anthropic from "@anthropic-ai/sdk";
import { TwitterApi } from "twitter-api-v2";

interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
}

async function checkClaude(): Promise<CheckResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: "Claude API", ok: false, message: "ANTHROPIC_API_KEY が未設定" };
  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    return { name: "Claude API", ok: true, message: `OK (model: ${res.model})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Claude API", ok: false, message: msg };
  }
}

async function checkTwitter(): Promise<CheckResult> {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return { name: "Twitter/X API", ok: false, message: "Twitter環境変数が未設定" };
  }
  try {
    const client = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_SECRET,
    });
    const me = await client.v2.me();
    return { name: "Twitter/X API", ok: true, message: `OK (@${me.data.username})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Twitter/X API", ok: false, message: msg };
  }
}

async function checkQiita(): Promise<CheckResult> {
  const token = process.env.QIITA_API_TOKEN;
  if (!token) return { name: "Qiita API", ok: false, message: "QIITA_API_TOKEN が未設定" };
  try {
    const res = await fetch("https://qiita.com/api/v2/authenticated_user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const user = await res.json();
    return { name: "Qiita API", ok: true, message: `OK (@${user.id})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Qiita API", ok: false, message: msg };
  }
}

async function checkGitHub(): Promise<CheckResult> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
        : {},
    });
    if (res.status === 401) {
      return { name: "GitHub", ok: false, message: "認証が必要 (gh auth login を実行)" };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const user = await res.json();
    return { name: "GitHub", ok: true, message: `OK (@${user.login})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "GitHub", ok: false, message: msg };
  }
}

async function main() {
  console.log("=== PR基盤 セットアップ検証 ===\n");

  const results = await Promise.all([
    checkClaude(),
    checkTwitter(),
    checkQiita(),
    checkGitHub(),
  ]);

  for (const r of results) {
    const icon = r.ok ? "[OK]" : "[NG]";
    console.log(`${icon} ${r.name}: ${r.message}`);
  }

  const allOk = results.every((r) => r.ok);
  console.log(`\n${allOk ? "すべての検証に成功しました！自動PR運用の準備が完了です。" : "上記のNGを解消してください。"}`);
  process.exit(allOk ? 0 : 1);
}

main();
