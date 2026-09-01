"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/supabase/types";
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementArchived,
  updateAnnouncement,
} from "@/app/actions/announcements";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AnnouncementForm({
  existing,
  onDone,
}: {
  existing?: Announcement;
  onDone: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = existing ? await updateAnnouncement(existing.id, fd) : await createAnnouncement(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      onDone();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Title</label>
        <input name="title" className="input" defaultValue={existing?.title ?? ""} required />
      </div>
      <div>
        <label className="label">Details</label>
        <textarea
          name="body"
          className="input"
          rows={3}
          defaultValue={existing?.body ?? ""}
          placeholder="e.g. Sept 8 is a regular holiday — offices closed."
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Auto-expire (optional)</label>
          <input
            name="expires_at"
            type="datetime-local"
            className="input"
            defaultValue={toLocalInput(existing?.expires_at ?? null)}
          />
        </div>
        <div>
          <label className="label">Image or video (optional)</label>
          <input
            name="media"
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          {existing?.media_path && (
            <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" name="remove_media" /> Remove current media
            </label>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : existing ? "Save changes" : "Post announcement"}
        </button>
        {existing && (
          <button type="button" className="btn-secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function AnnouncementsSection({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const supabase = createClient();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await action();
      setError(res.error ?? null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Announcements</h2>
          <p className="text-sm text-slate-500">
            Shown on everyone's home page until expired or archived.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showNew ? "Close" : "New announcement"}
        </button>
      </div>

      {error && (
        <div className="card border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}

      {showNew && (
        <div className="card p-5">
          <AnnouncementForm onDone={() => setShowNew(false)} />
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {announcements.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No announcements yet.</div>
        )}
        {announcements.map((a) => {
          const expired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
          const mediaUrl = a.media_path
            ? supabase.storage.from("announcements").getPublicUrl(a.media_path).data.publicUrl
            : null;
          return (
            <div key={a.id} className="p-4 space-y-2">
              {editingId === a.id ? (
                <AnnouncementForm existing={a} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{a.title}</span>
                        {a.archived && (
                          <span className="badge bg-slate-100 text-slate-500 ring-slate-500/20">
                            archived
                          </span>
                        )}
                        {expired && !a.archived && (
                          <span className="badge bg-amber-50 text-amber-700 ring-amber-600/20">
                            expired
                          </span>
                        )}
                      </div>
                      {a.body && (
                        <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap line-clamp-3">
                          {a.body}
                        </p>
                      )}
                      {mediaUrl && (
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          {a.media_type === "video" ? "View video" : "View image"}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-slate-400">
                      <button
                        title="Edit"
                        className="hover:text-indigo-600"
                        onClick={() => setEditingId(a.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title={a.archived ? "Unarchive" : "Archive"}
                        className="hover:text-indigo-600"
                        onClick={() => run(() => setAnnouncementArchived(a.id, !a.archived))}
                      >
                        {a.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        title="Delete permanently"
                        className="hover:text-rose-600"
                        onClick={() => {
                          if (confirm(`Delete "${a.title}" permanently?`)) {
                            run(() => deleteAnnouncement(a.id));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
