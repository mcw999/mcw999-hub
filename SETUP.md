# PR基盤 セットアップガイド

以下の手順を上から順に実行してください。所要時間: 約30〜40分。

---

## Step 1: GitHub アカウント作成 + CLI認証 (10分)

1. https://github.com/signup を開く
2. アカウントを作成（ユーザー名: `mcw999` 推奨）
3. ターミナルで以下を実行:

```bash
gh auth login
```

- `GitHub.com` を選択
- `HTTPS` を選択
- `Login with a web browser` を選択
- 表示されるコードをブラウザで入力

4. リポジトリを作成:

```bash
cd ~/mcw999-hub
gh repo create mcw999-hub --public --source=. --push
```

5. GitHub Pages を有効化:
   - https://github.com/mcw999/mcw999-hub/settings/pages を開く
   - Source: `GitHub Actions` を選択

---

## Step 2: Anthropic API キー取得 (5分)

1. https://console.anthropic.com/ を開く
2. アカウント作成 (Googleアカウントで可)
3. 左メニュー「API keys」→「Create Key」
4. キーをコピー (`sk-ant-...` で始まる文字列)
5. GitHubリポジトリにシークレットとして登録:

```bash
gh secret set ANTHROPIC_API_KEY
# プロンプトが出たらキーを貼り付けてEnter
```

---

## Step 3: Zenn アカウント作成 + GitHub連携 (5分)

1. https://zenn.dev/ を開く
2. 「GitHubでログイン」でアカウント作成
3. https://zenn.dev/dashboard/deploys を開く
4. 「リポジトリを連携する」→ `mcw999-hub` を選択
5. 完了。articles/ に記事をpushすると自動公開される

---

## Step 4: Qiita アカウント作成 + APIトークン発行 (5分)

1. https://qiita.com/signup を開く
2. アカウント作成
3. https://qiita.com/settings/tokens/new を開く
4. 説明: `mcw999-hub auto post`
5. スコープ: `read_qiita`, `write_qiita` にチェック
6. 「発行する」をクリック
7. トークンをコピーして登録:

```bash
gh secret set QIITA_API_TOKEN
# プロンプトが出たらトークンを貼り付けてEnter
```

---

## Step 5: Twitter/X アカウント作成 + API設定 (15分)

1. https://x.com/i/flow/signup を開いてアカウント作成
2. https://developer.x.com/ を開く
3. 「Sign up for Free Account」
4. Developer Portal → Projects & Apps → 自分のアプリを選択
5. 「Keys and tokens」タブ:
   - **API Key and Secret** を生成してコピー
   - **Access Token and Secret** を生成してコピー
     - パーミッションは「Read and Write」にする
6. 4つのキーをそれぞれ登録:

```bash
gh secret set TWITTER_API_KEY
gh secret set TWITTER_API_SECRET
gh secret set TWITTER_ACCESS_TOKEN
gh secret set TWITTER_ACCESS_SECRET
```

---

## Step 6: 検証

すべての認証情報が正しいか確認:

```bash
cd ~/mcw999-hub

# ローカルで検証する場合 (.envファイルを作成)
cp .env.example .env
# .env に各キーを記入
source <(grep -v '^#' .env | sed 's/^/export /')
npx tsx scripts/verify-setup.ts
```

全項目が `[OK]` になれば完了。

---

## Step 7: 初回実行

```bash
# 手動でワークフローを実行して動作確認
gh workflow run "Weekly PR Content Generation & Distribution"

# 実行状況を確認
gh run list --workflow=weekly-pr.yml
```

---

## 完了後の動作

以下がすべて自動で実行されます:

| タイミング | 動作 |
|-----------|------|
| 毎週月曜 9:00 JST | Claude APIでコンテンツ自動生成 |
| 同上 | Twitter/Xに自動投稿 |
| 同上 | Qiitaに記事を自動投稿 |
| 同上 | Zenn記事を自動公開 (push時に連携) |
| 同上 | ポートフォリオサイトを自動更新・デプロイ |

**あなたは何もする必要がありません。**
