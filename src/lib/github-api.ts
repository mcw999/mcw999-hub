const OWNER = "mcw999";
const REPO = "mcw999-hub";
const PROJECTS_PATH = "content/projects";

interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubDirEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

function getToken(): string {
  const token = localStorage.getItem("github_pat");
  if (!token) throw new Error("GitHub PAT が設定されていません");
  return token;
}

function headers(): HeadersInit {
  return {
    Authorization: `token ${getToken()}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

async function apiRequest(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    ...options,
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listProjectFiles(): Promise<GitHubDirEntry[]> {
  const entries: GitHubDirEntry[] = await apiRequest(PROJECTS_PATH);
  return entries.filter((e) => e.type === "file" && e.name.endsWith(".json"));
}

export async function getProjectFile(slug: string): Promise<{ data: Record<string, unknown>; sha: string }> {
  const file: GitHubFileResponse = await apiRequest(`${PROJECTS_PATH}/${slug}.json`);
  const decoded = atob(file.content.replace(/\n/g, ""));
  const text = new TextDecoder().decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
  return { data: JSON.parse(text), sha: file.sha };
}

export async function saveProjectFile(
  slug: string,
  data: Record<string, unknown>,
  sha?: string,
): Promise<void> {
  const content = btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n"),
    ),
  );
  await apiRequest(`${PROJECTS_PATH}/${slug}.json`, {
    method: "PUT",
    body: JSON.stringify({
      message: sha ? `update ${slug}` : `add ${slug}`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function deleteProjectFile(slug: string, sha: string): Promise<void> {
  await apiRequest(`${PROJECTS_PATH}/${slug}.json`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `delete ${slug}`,
      sha,
    }),
  });
}

export async function verifyToken(): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: headers(),
  });
  if (!res.ok) throw new Error("トークンが無効です");
  const user = await res.json();
  return user.login;
}
