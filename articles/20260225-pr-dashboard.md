---
title: "個人開発プロジェクトのPR自動化：GitHub ActionsとClaude CLIでマルチプラットフォーム投稿パイプラインを作る"
emoji: "🚀"
type: "tech"
topics: ["個人開発", "githubactions", "claude", "tauri", "sns運用"]
published: true
---

個人開発をしているとこういう経験はないでしょうか。

プロダクトをリリースしたのにZennに記事を書く余裕がない。Twitterに告知しようと思ったが文章を考えているうちに面倒になった。Qiitaにも投稿したいけど、プラットフォームごとに文体を変えるのが辛い。結局「後でやろう」のまま数週間が経っている——。

自分もずっとこの問題を抱えていました。コードを書く時間は確保できても、プロモーションのための文章を複数プラットフォーム向けに書く時間と気力が続かない。個人開発においてPRは明らかに後回しにされがちです。

この記事では、その課題をどう技術で解決するか、具体的なアーキテクチャと実装のポイントを共有します。

## 問題の整理：なぜ個人開発者のPRは続かないのか

まず問題を整理しましょう。個人開発者がPRを継続できない理由は大きく3つあります。

1. **コンテキストスイッチのコスト**：コードを書いていた頭から、マーケティング文章を書く頭に切り替えるのは想像以上に疲れる
2. **プラットフォームごとの最適化の手間**：Twitterは140字、Zennは技術記事、Qiitaはタグ管理、Dev.toは英語圏向け……それぞれ異なる形式で書く必要がある
3. **継続の難しさ**：リリース直後は投稿するが、アップデートのたびに投稿し続ける仕組みがない

これらを解決するには、「人間が文章を書く」部分をAIに委ねつつ、「投稿する」部分をGitHub Actionsで自動化するパイプラインを作るのが現実的です。

## アーキテクチャの全体像

自分が作ったシステムは以下のような構成になっています。

```
[デスクトップアプリ (Tauri)]
  ↓ プロジェクト情報をJSONで管理
[mcw999-hub リポジトリ (Git)]
  ├── content/projects/*.json  ← プロジェクト定義
  ├── content/meta/*.json      ← 生成済みコンテンツ
  └── traffic-history.json    ← アナリティクス蓄積
  ↓ GitHub Actions ワークフロー
[各プラットフォームへの投稿]
  ├── Twitter (API v2)
  ├── Qiita (REST API)
  ├── Dev.to (REST API)
  └── GitHub Pages (ブログ)
```

**Gitリポジトリをデータストアとして使う**のがこの設計のポイントです。デスクトップアプリとGitHub Actionsワークフローが同じJSONファイルを読み書きすることで、「ローカルで生成したコンテンツをCIが投稿する」という流れが自然に作れます。

## Claude CLIを非対話モードで使う

プロジェクト分析にはClaude CLIを使っていますが、ここで重要なのが**非対話実行**です。

当初はPowerShellの`SendKeys`でターミナルウィンドウを自動操作していました。フォルダ信頼承認→プロンプト貼り付け→Enter送信を`Sleep`で制御する方法です。しかしマシン負荷によってタイミングがずれ、「分析中」のまま永遠に止まるという問題が頻発しました。

解決策は`--print`モード（`-p`）と`--permission-mode bypassPermissions`の組み合わせです。

```bash
# プロジェクトディレクトリに移動してClaude CLIを非対話実行
cd /path/to/project
claude -p "以下のプロジェクトを分析して、技術スタック・カテゴリ・ターゲット層をJSON形式で返してください" \
  --permission-mode bypassPermissions
```

`-p`（print）モードはUIを一切起動せず、標準出力に結果を返して終了します。`bypassPermissions`はフォルダアクセスの確認ダイアログをスキップします。これでウィンドウ操作なしにstdoutから直接JSON結果を受け取れるようになりました。

Rust（Tauri）側からは`std::process::Command`で呼び出します。

```rust
use std::process::Command;

pub fn analyze_project_with_claude(project_path: &str) -> Result<String, String> {
    let prompt = format!(
        "プロジェクトを分析してJSON形式で返してください。\
        フィールド: name, description, techStack(配列), category, targetAudience"
    );

    let output = Command::new("claude")
        .arg("-p")
        .arg(&prompt)
        .arg("--permission-mode")
        .arg("bypassPermissions")
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Claude CLI実行エラー: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Claude CLIエラー: {}", stderr))
    }
}
```

実測では30〜120秒かかりますが、完全に非同期で実行できるためUIはブロックされません。

なお**Windowsで日本語パスを含むディレクトリ**から起動するとエンコーディング問題が発生します。回避策として、PowerShellの`Scripting.FileSystemObject`で8.3短縮パスに変換してから渡す必要があります。

## プロジェクト情報をJSONで管理する

Claude分析を毎回待つのはコストが高いため、`.pr-meta.json`をプロジェクトルートに置く仕組みを導入しました。

```json
{
  "name": "my-awesome-tool",
  "nameJa": "便利ツール",
  "tagline": "A tool that automates your workflow",
  "taglineJa": "ワークフローを自動化するツール",
  "description": "...",
  "descriptionJa": "日本語説明...",
  "techStack": ["React", "TypeScript", "Tauri"],
  "category": "tool",
  "targetAudience": ["developers", "engineers"],
  "github": "https://github.com/username/repo",
  "tags": ["個人開発", "自動化", "デスクトップアプリ"]
}
```

このファイルがあれば0.5秒以下で完全な情報を取得できます。特に**日本語フィールド（`nameJa`、`taglineJa`、`descriptionJa`）はファイルスキャンでは絶対に取れない**ため、この仕組みが不可欠でした。

ファイルがない場合は`package.json`や`Cargo.toml`から技術スタックを逆引きします。

```typescript
// npm依存関係から技術スタックを推論する
const NPM_TO_TECH: Record<string, string> = {
  "react": "React",
  "next": "Next.js",
  "vue": "Vue.js",
  "svelte": "Svelte",
  "tailwindcss": "TailwindCSS",
  "@tailwindcss/vite": "TailwindCSS",
  "prisma": "Prisma",
  "drizzle-orm": "Drizzle ORM",
  "three": "Three.js",
  "electron": "Electron",
  "trpc": "tRPC",
  // ...14パターン
};

function inferTechStack(packageJson: Record<string, unknown>): string[] {
  const deps = {
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {}),
  };

  const detected = new Set<string>();
  for (const dep of Object.keys(deps)) {
    // パッケージ名のプレフィックスでマッチ
    for (const [key, tech] of Object.entries(NPM_TO_TECH)) {
      if (dep === key || dep.startsWith(`${key}/`)) {
        detected.add(tech);
      }
    }
  }
  return Array.from(detected);
}
```

このシンプルなマッピング方式が「思った以上に精度が高い」というのが実際に使ってみた感想です。

## GitHub Actionsで投稿を自動化する

コンテンツが生成できたら、実際の投稿はGitHub Actionsに任せます。デスクトップアプリからは`gh`コマンドでワークフローをトリガーします。

```bash
gh workflow run publish-content.yml \
  --field project_slug=my-awesome-tool \
  --field platforms=qiita,devto,twitter
```

ワークフロー側では各プラットフォームのAPIを叩きます。

```yaml
name: Publish Content

on:
  workflow_dispatch:
    inputs:
      project_slug:
        required: true
      platforms:
        required: true

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish to Qiita
        if: contains(inputs.platforms, 'qiita')
        run: |
          CONTENT=$(cat content/meta/${{ inputs.project_slug }}/qiita.md)
          curl -X POST https://qiita.com/api/v2/items \
            -H "Authorization: Bearer ${{ secrets.QIITA_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"title\": \"$(cat content/meta/${{ inputs.project_slug }}/title.txt)\",
              \"body\": $(echo "$CONTENT" | jq -Rs .),
              \"tags\": [{\"name\": \"個人開発\"}, {\"name\": \"自動化\"}],
              \"private\": false
            }"

      - name: Publish to Dev.to
        if: contains(inputs.platforms, 'devto')
        run: |
          curl -X POST https://dev.to/api/articles \
            -H "api-key: ${{ secrets.DEVTO_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d @content/meta/${{ inputs.project_slug }}/devto.json
```

各プラットフォームの認証方式が異なる点は注意が必要です。QiitaはBearerトークン（`Authorization: Bearer <token>`）で `/api/v2/authenticated_user` を叩くとユーザーIDが返ります。Dev.toは`api-key`ヘッダで `/api/users/me` です。ZennはパブリックAPIを提供していないため手動投稿を前提にする必要があります。

## GitHub Traffic APIの14日制限を回避する

GitHub Traffic APIは直近14日分のデータしか返しません。長期のトラフィック推移を見たい場合は、取得するたびに手動でデータを蓄積する仕組みが必要です。

```typescript
interface TrafficData {
  date: string;
  views: number;
  unique_visitors: number;
}

interface TrafficHistory {
  [repoName: string]: TrafficData[];
}

async function mergeAndSaveTrafficData(
  repoName: string,
  newData: TrafficData[]
): Promise<void> {
  // 既存の蓄積データを読み込む
  const historyPath = "traffic-history.json";
  let history: TrafficHistory = {};

  try {
    const existing = await fs.readFile(historyPath, "utf-8");
    history = JSON.parse(existing);
  } catch {
    // ファイルがなければ空で開始
  }

  const existingData = history[repoName] || [];

  // 既存データと新データをマージ（日付でdedup）
  const merged = new Map<string, TrafficData>();
  for (const item of [...existingData, ...newData]) {
    merged.set(item.date, item); // 新しいデータで上書き
  }

  history[repoName] = Array.from(merged.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
}
```

このJSONファイルをGitリポジトリにコミットしておくことで、過去のデータが永続化されます。

また、アナリティクスデータを取得する際は**ローカルの作業中変更を保護する**ことも重要です。`git stash → git pull --ff-only → git stash pop`の順序でリモートデータを取得し、ローカル変更を保持します。当初`stash drop`を使っていたため、作業中の変更が消失するバグがありました。

## Tauri v2でのフロントエンド・Rust間の型安全なIPC

TauriアプリでフロントエンドからRustの関数を呼ぶ際、`invoke<T>()`のジェネリクスで戻り値の型を指定できます。

```typescript
// useApi.ts - IPCの集約フック
import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";

interface ProjectInfo {
  name: string;
  nameJa: string;
  techStack: string[];
  category: string;
}

function createApi() {
  return {
    scanProject: (path: string) =>
      invoke<ProjectInfo>("scan_project", { path }),

    analyzeWithClaude: (path: string) =>
      invoke<ProjectInfo>("analyze_project_with_claude", { path }),

    triggerWorkflow: (slug: string, platforms: string[]) =>
      invoke<void>("trigger_workflow", { slug, platforms }),

    getTrafficData