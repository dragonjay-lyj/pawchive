"use client";

import { useEffect, useState, useTransition } from "react";
import { checkPostFlag, flagPost, AuthError } from "@/lib/api";

interface Props {
  service: string;
  creatorId: string;
  postId: string;
}

export function FlagButton({ service, creatorId, postId }: Props) {
  const [flagged, setFlagged] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    checkPostFlag(service, creatorId, postId)
      .then((v) => { if (!cancelled) setFlagged(v); })
      .catch(() => { if (!cancelled) setFlagged(false); });
    return () => { cancelled = true; };
  }, [service, creatorId, postId]);

  const submit = () => {
    if (flagged || pending) return;
    setErr(null);
    startTransition(async () => {
      try {
        await flagPost(service, creatorId, postId);
        setFlagged(true);
      } catch (e) {
        if (e instanceof AuthError) setErr("Sign in to flag.");
        else setErr("Flag failed.");
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={submit}
        disabled={pending || flagged === true || flagged === null}
        title={flagged ? "Already flagged for re-import" : "Flag for re-import"}
        className={`neo-badge inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-60 ${
          flagged ? "bg-error/20 text-error" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
        }`}
      >
        <span className="text-sm leading-none">⚑</span>
        <span>
          {flagged === null ? "…" : flagged ? "Flagged" : pending ? "Flagging…" : "Flag re-import"}
        </span>
      </button>
      {err && <span className="text-[10px] text-error">{err}</span>}
    </div>
  );
}
