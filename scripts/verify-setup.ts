/**
 * verify-setup.ts
 * すべての認証情報が正しく設定されているか検証する。
 * アカウント作成後、最初に実行するスクリプト。
 */
import Anthropic from "@anthropic-ai/sdk";

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

async function checkBluesky(): Promise<CheckResult> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !appPassword) return { name: "Bluesky", ok: false, message: "BLUESKY_HANDLE / BLUESKY_APP_PASSWORD が未設定" };
  try {
    const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const session = await res.json();
    return { name: "Bluesky", ok: true, message: `OK (${session.handle})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Bluesky", ok: false, message: msg };
  }
}

async function checkMastodon(): Promise<CheckResult> {
  const instance = process.env.MASTODON_INSTANCE;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!instance || !token) return { name: "Mastodon", ok: false, message: "MASTODON_INSTANCE / MASTODON_ACCESS_TOKEN が未設定" };
  try {
    const host = instance.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const res = await fetch(`https://${host}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const me = await res.json();
    return { name: "Mastodon", ok: true, message: `OK (@${me.username}@${host})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Mastodon", ok: false, message: msg };
  }
}

async function checkHashnode(): Promise<CheckResult> {
  const pat = process.env.HASHNODE_PAT;
  if (!pat) return { name: "Hashnode", ok: false, message: "HASHNODE_PAT が未設定" };
  try {
    const res = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: pat,
      },
      body: JSON.stringify({
        query: `query { me { username } }`,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const username = data?.data?.me?.username || "unknown";
    return { name: "Hashnode", ok: true, message: `OK (@${username})` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Hashnode", ok: false, message: msg };
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
    checkQiita(),
    checkBluesky(),
    checkMastodon(),
    checkHashnode(),
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
