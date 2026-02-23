"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  listProjectFiles,
  getProjectFile,
  saveProjectFile,
  deleteProjectFile,
  verifyToken,
} from "@/lib/github-api";
import type { ProjectDefinition, ProjectFeature } from "@/lib/types";

type View = "list" | "create" | "edit";

const CATEGORIES = ["crypto", "saas", "tool", "platform", "other"] as const;
const STATUSES = ["active", "beta", "development", "prototype", "archived"] as const;
const PLATFORM_OPTIONS = ["web", "desktop", "mobile", "cli"] as const;
const SCHEDULE_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
const SCHEDULE_PLATFORMS = ["twitter", "zenn", "qiita", "blog", "devto", "reddit"] as const;

function emptyProject(): ProjectDefinition {
  const today = new Date().toISOString().slice(0, 10);
  return {
    slug: "",
    name: "",
    tagline: "",
    description: "",
    category: "tool",
    tags: [],
    targetAudience: [],
    status: "development",
    techStack: [],
    platforms: [],
    features: [],
    createdAt: today,
    updatedAt: today,
    order: 99,
    featured: false,
  };
}

// ---------- Auth Gate ----------

function AuthGate({ onAuth }: { onAuth: (user: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      localStorage.setItem("github_pat", token);
      const user = await verifyToken();
      onAuth(user);
    } catch {
      setError("トークンが無効です。repo スコープ付きの PAT を入力してください。");
      localStorage.removeItem("github_pat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Admin</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          GitHub Personal Access Token（repo スコープ）を入力
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
        {error && (
          <p className="text-sm mb-4 flex items-center gap-2" style={{ color: "#ef4444" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading || !token}
          className="w-full py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "ログイン"}
        </button>
      </div>
    </div>
  );
}

// ---------- Collapsible Section ----------

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold"
        style={{ background: "var(--card)", color: "var(--foreground)" }}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-5 py-4 space-y-4" style={{ background: "var(--background)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- Form Field Helpers ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
      style={inputStyle}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--accent)]"
      style={inputStyle}
    />
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }
  return (
    <div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            {tag} <X className="w-3 h-3" />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Enter で追加"}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

function StringListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function update(i: number, v: string) {
    const next = [...value];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, ""]);
  }
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={inputStyle}
          />
          <button onClick={() => remove(i)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "#ef4444" }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
      >
        + 追加
      </button>
    </div>
  );
}

// ---------- Features Editor ----------

function FeaturesEditor({ features, onChange }: { features: ProjectFeature[]; onChange: (f: ProjectFeature[]) => void }) {
  function update(i: number, patch: Partial<ProjectFeature>) {
    const next = [...features];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(features.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...features, { title: "", description: "" }]);
  }
  return (
    <div className="space-y-4">
      {features.map((f, i) => (
        <div key={i} className="p-4 rounded-xl space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Feature {i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 hover:opacity-70" style={{ color: "#ef4444" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <Field label="Title">
            <TextInput value={f.title} onChange={(v) => update(i, { title: v })} />
          </Field>
          <Field label="Title (JA)">
            <TextInput value={f.titleJa || ""} onChange={(v) => update(i, { titleJa: v || undefined })} />
          </Field>
          <Field label="Description">
            <TextArea value={f.description} onChange={(v) => update(i, { description: v })} />
          </Field>
          <Field label="Description (JA)">
            <TextArea value={f.descriptionJa || ""} onChange={(v) => update(i, { descriptionJa: v || undefined })} />
          </Field>
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
      >
        + Feature 追加
      </button>
    </div>
  );
}

// ---------- Project Form ----------

function ProjectForm({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: ProjectDefinition;
  isNew: boolean;
  onSave: (p: ProjectDefinition, sha?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [p, setP] = useState<ProjectDefinition>(initial);
  const [sha, setSha] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNew) {
      getProjectFile(initial.slug).then(({ sha }) => setSha(sha)).catch(() => {});
    }
  }, [initial.slug, isNew]);

  function set<K extends keyof ProjectDefinition>(key: K, value: ProjectDefinition[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!p.slug || !p.name || !p.tagline || !p.description) {
      setError("slug, name, tagline, description は必須です");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...p, updatedAt: new Date().toISOString().slice(0, 10) }, sha);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {isNew ? "プロジェクト作成" : `編集: ${p.name}`}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--muted)" }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Basic Info */}
      <Section title="基本情報" defaultOpen>
        <Field label="Slug">
          <TextInput value={p.slug} onChange={(v) => set("slug", v.replace(/[^a-z0-9-]/g, ""))} placeholder="my-project" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name (EN)">
            <TextInput value={p.name} onChange={(v) => set("name", v)} />
          </Field>
          <Field label="Name (JA)">
            <TextInput value={p.nameJa || ""} onChange={(v) => set("nameJa", v || undefined)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tagline (EN)">
            <TextInput value={p.tagline} onChange={(v) => set("tagline", v)} />
          </Field>
          <Field label="Tagline (JA)">
            <TextInput value={p.taglineJa || ""} onChange={(v) => set("taglineJa", v || undefined)} />
          </Field>
        </div>
        <Field label="Description (EN)">
          <TextArea value={p.description} onChange={(v) => set("description", v)} />
        </Field>
        <Field label="Description (JA)">
          <TextArea value={p.descriptionJa || ""} onChange={(v) => set("descriptionJa", v || undefined)} />
        </Field>
      </Section>

      {/* Category & Status */}
      <Section title="カテゴリ・ステータス" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={p.category}
              onChange={(e) => set("category", e.target.value as ProjectDefinition["category"])}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={p.status}
              onChange={(e) => set("status", e.target.value as ProjectDefinition["status"])}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Order">
            <input
              type="number"
              value={p.order}
              onChange={(e) => set("order", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={inputStyle}
            />
          </Field>
          <Field label="Featured">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} />
              <span className="text-sm" style={{ color: "var(--foreground)" }}>Featured</span>
            </label>
          </Field>
          <Field label="Auto Promote">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={p.autoPromote || false} onChange={(e) => set("autoPromote", e.target.checked)} />
              <span className="text-sm" style={{ color: "var(--foreground)" }}>Enabled</span>
            </label>
          </Field>
        </div>
      </Section>

      {/* Tags & Tech */}
      <Section title="タグ・技術スタック">
        <Field label="Tags">
          <TagInput value={p.tags} onChange={(v) => set("tags", v)} placeholder="タグを入力" />
        </Field>
        <Field label="Tech Stack">
          <TagInput value={p.techStack} onChange={(v) => set("techStack", v)} placeholder="React, TypeScript..." />
        </Field>
        <Field label="Target Audience">
          <TagInput value={p.targetAudience} onChange={(v) => set("targetAudience", v)} />
        </Field>
        <Field label="Platforms">
          <div className="flex gap-3 flex-wrap">
            {PLATFORM_OPTIONS.map((pl) => (
              <label key={pl} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--foreground)" }}>
                <input
                  type="checkbox"
                  checked={p.platforms.includes(pl)}
                  onChange={(e) => {
                    if (e.target.checked) set("platforms", [...p.platforms, pl]);
                    else set("platforms", p.platforms.filter((x) => x !== pl));
                  }}
                />
                {pl}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* URLs */}
      <Section title="URL">
        <Field label="Repository URL">
          <TextInput value={p.repositoryUrl || ""} onChange={(v) => set("repositoryUrl", v || undefined)} placeholder="https://github.com/..." />
        </Field>
        <Field label="Live URL">
          <TextInput value={p.liveUrl || ""} onChange={(v) => set("liveUrl", v || undefined)} />
        </Field>
        <Field label="Demo URL">
          <TextInput value={p.demoUrl || ""} onChange={(v) => set("demoUrl", v || undefined)} />
        </Field>
      </Section>

      {/* Features */}
      <Section title="Features">
        <FeaturesEditor features={p.features} onChange={(f) => set("features", f)} />
      </Section>

      {/* PR / Marketing */}
      <Section title="PR・マーケティング">
        <Field label="User Problem (EN)">
          <TextArea value={p.userProblem || ""} onChange={(v) => set("userProblem", v || undefined)} />
        </Field>
        <Field label="User Problem (JA)">
          <TextArea value={p.userProblemJa || ""} onChange={(v) => set("userProblemJa", v || undefined)} />
        </Field>
        <Field label="Solution (EN)">
          <TextArea value={p.solution || ""} onChange={(v) => set("solution", v || undefined)} />
        </Field>
        <Field label="Solution (JA)">
          <TextArea value={p.solutionJa || ""} onChange={(v) => set("solutionJa", v || undefined)} />
        </Field>
        <Field label="Call to Action">
          <TextInput value={p.callToAction || ""} onChange={(v) => set("callToAction", v || undefined)} />
        </Field>
        <Field label="CTA URL">
          <TextInput value={p.callToActionUrl || ""} onChange={(v) => set("callToActionUrl", v || undefined)} />
        </Field>
        <Field label="Promotion Keywords">
          <TagInput value={p.promotionKeywords || []} onChange={(v) => set("promotionKeywords", v.length ? v : undefined)} />
        </Field>
      </Section>

      {/* Source Notes */}
      <Section title="一次素材（sourceNotes）">
        <Field label="体験ログ (experiences)">
          <StringListInput
            value={p.sourceNotes?.experiences || []}
            onChange={(v) => set("sourceNotes", { ...p.sourceNotes, experiences: v.length ? v : undefined })}
            placeholder="例: バックテストで勝率58%→63%に改善した"
          />
        </Field>
        <Field label="観察メモ (observations)">
          <StringListInput
            value={p.sourceNotes?.observations || []}
            onChange={(v) => set("sourceNotes", { ...p.sourceNotes, observations: v.length ? v : undefined })}
          />
        </Field>
        <Field label="実測データ (metrics)">
          <StringListInput
            value={p.sourceNotes?.metrics || []}
            onChange={(v) => set("sourceNotes", { ...p.sourceNotes, metrics: v.length ? v : undefined })}
          />
        </Field>
        <Field label="失敗談 (failures)">
          <StringListInput
            value={p.sourceNotes?.failures || []}
            onChange={(v) => set("sourceNotes", { ...p.sourceNotes, failures: v.length ? v : undefined })}
          />
        </Field>
      </Section>

      {/* Schedule */}
      <Section title="スケジュール">
        <Field label="Frequency">
          <select
            value={p.schedule?.frequency || ""}
            onChange={(e) => {
              const freq = e.target.value as ProjectDefinition["schedule"] extends { frequency: infer F } ? F : never;
              if (!freq) { set("schedule", undefined); return; }
              set("schedule", { frequency: freq, platforms: p.schedule?.platforms || [] });
            }}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            <option value="">未設定</option>
            {SCHEDULE_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        {p.schedule && (
          <Field label="Platforms">
            <div className="flex gap-3 flex-wrap">
              {SCHEDULE_PLATFORMS.map((sp) => (
                <label key={sp} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--foreground)" }}>
                  <input
                    type="checkbox"
                    checked={p.schedule?.platforms.includes(sp) || false}
                    onChange={(e) => {
                      const platforms = e.target.checked
                        ? [...(p.schedule?.platforms || []), sp]
                        : (p.schedule?.platforms || []).filter((x) => x !== sp);
                      set("schedule", { ...p.schedule!, platforms });
                    }}
                  />
                  {sp}
                </label>
              ))}
            </div>
          </Field>
        )}
      </Section>

      {/* Save */}
      {error && (
        <p className="text-sm mb-4 flex items-center gap-2" style={{ color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-xl font-medium transition-all"
          style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ---------- Project List ----------

interface ProjectEntry {
  slug: string;
  name: string;
  status: string;
  category: string;
  order: number;
  sha: string;
}

function ProjectList({
  projects,
  loading,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: {
  projects: ProjectEntry[];
  loading: boolean;
  onEdit: (slug: string) => void;
  onDelete: (slug: string, sha: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const statusColors: Record<string, string> = {
    active: "#4ade80",
    beta: "#facc15",
    development: "#a5b4fc",
    prototype: "#c084fc",
    archived: "#a3a3a3",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>プロジェクト一覧</h2>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "更新"}
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="w-4 h-4" /> 新規作成
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {projects
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <div
                key={p.slug}
                className="flex items-center justify-between p-4 rounded-xl transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono w-6 text-center" style={{ color: "var(--muted)" }}>
                    {p.order}
                  </span>
                  <div>
                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{p.name}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{p.slug}</span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ color: statusColors[p.status] || "var(--muted)", border: `1px solid ${statusColors[p.status] || "var(--border)"}` }}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{p.category}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(p.slug)}
                    className="p-2 rounded-lg hover:opacity-70 transition-all"
                    style={{ color: "var(--accent)" }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`「${p.name}」を削除しますか？`)) onDelete(p.slug, p.sha);
                    }}
                    className="p-2 rounded-lg hover:opacity-70 transition-all"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main AdminPage ----------

export function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [view, setView] = useState<View>("list");
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [editData, setEditData] = useState<ProjectDefinition | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Auto-login if PAT exists
  useEffect(() => {
    const pat = localStorage.getItem("github_pat");
    if (pat) {
      verifyToken()
        .then((user) => { setAuthed(true); setUsername(user); })
        .catch(() => localStorage.removeItem("github_pat"));
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const files = await listProjectFiles();
      const entries: ProjectEntry[] = await Promise.all(
        files.map(async (f) => {
          const slug = f.name.replace(".json", "");
          const { data } = await getProjectFile(slug);
          return {
            slug,
            name: (data.name as string) || slug,
            status: (data.status as string) || "development",
            category: (data.category as string) || "other",
            order: (data.order as number) ?? 99,
            sha: f.sha,
          };
        }),
      );
      setProjects(entries);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "読み込みエラー", false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (authed) loadProjects();
  }, [authed, loadProjects]);

  function handleLogout() {
    localStorage.removeItem("github_pat");
    setAuthed(false);
    setUsername("");
  }

  async function handleEdit(slug: string) {
    try {
      const { data } = await getProjectFile(slug);
      setEditData(data as unknown as ProjectDefinition);
      setEditSlug(slug);
      setView("edit");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "読み込みエラー", false);
    }
  }

  async function handleDelete(slug: string, sha: string) {
    try {
      await deleteProjectFile(slug, sha);
      showToast(`${slug} を削除しました`, true);
      loadProjects();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "削除エラー", false);
    }
  }

  async function handleSave(p: ProjectDefinition, sha?: string) {
    const { slug, ...rest } = p;
    await saveProjectFile(slug, { slug, ...rest } as unknown as Record<string, unknown>, sha);
    showToast(`${p.name} を保存しました`, true);
    setView("list");
    loadProjects();
  }

  if (!authed) {
    return <AuthGate onAuth={(user) => { setAuthed(true); setUsername(user); }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-bold" style={{ color: "var(--foreground)" }}>Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--muted)" }}>{username}</span>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--muted)" }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {view === "list" && (
          <ProjectList
            projects={projects}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={() => { setEditData(null); setView("create"); }}
            onRefresh={loadProjects}
          />
        )}
        {view === "create" && (
          <ProjectForm
            initial={emptyProject()}
            isNew
            onSave={handleSave}
            onCancel={() => setView("list")}
          />
        )}
        {view === "edit" && editData && (
          <ProjectForm
            initial={editData}
            isNew={false}
            onSave={handleSave}
            onCancel={() => setView("list")}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
          style={{
            background: toast.ok ? "#065f46" : "#7f1d1d",
            color: "white",
          }}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
