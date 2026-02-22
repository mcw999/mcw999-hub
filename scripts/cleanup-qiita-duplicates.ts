/**
 * cleanup-qiita-duplicates.ts
 * Qiita上の重複記事を削除する（一度だけ実行）。
 * 使い方: QIITA_API_TOKEN=xxx npx tsx scripts/cleanup-qiita-duplicates.ts
 */

const TOKEN = process.env.QIITA_API_TOKEN;
if (!TOKEN) {
  console.error("QIITA_API_TOKEN が必要です。");
  process.exit(1);
}

// 閲覧数が少ない重複記事のIDを指定（analytics.jsonから確認）
const DUPLICATE_IDS = [
  "ecdf7229bf65754ca6cb", // 完全ガイド3ステップ (1 view)
  "2ba73484b102a4ebd07e", // 完全ガイド3ステップ (5 views)
];

async function main() {
  for (const id of DUPLICATE_IDS) {
    console.log(`Deleting article ${id}...`);
    const res = await fetch(`https://qiita.com/api/v2/items/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (res.ok || res.status === 204) {
      console.log(`  Deleted: ${id}`);
    } else {
      console.error(`  Failed: ${res.status} ${await res.text()}`);
    }
  }
  console.log("Done.");
}

main();
