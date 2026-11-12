// 2026-11-12 12:38 KST
// 결과 화면(PRD 4.5). 감정, 강도, 공감 메시지. AI 실패면 다시 분석하기, 위기 표시면 위기 카드.
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { analyzeEntry, ApiError, getEntry } from "@/components/api-client";
import { CrisisCard } from "@/components/crisis-card";
import { EntryAnalysis } from "@/components/entry-analysis";
import { SESSION_EXPIRED_MESSAGE, useSessionExpired } from "@/components/use-session-expired";
import type { Entry } from "@/lib/types";

type Status = "loading" | "ready" | "notfound" | "error";

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { expired, handleUnauthorized } = useSessionExpired();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [reError, setReError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getEntry(id)
      .then((e) => {
        if (cancelled) return;
        setEntry(e);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || handleUnauthorized(err)) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, handleUnauthorized]);

  async function reanalyze() {
    setBusy(true);
    setReError(null);
    try {
      setEntry(await analyzeEntry(id));
    } catch (err) {
      if (handleUnauthorized(err)) return;
      if (err instanceof ApiError && err.status === 404) setStatus("notfound");
      else setReError("다시 분석하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <div className="card">
        <p className="error-text" role="alert">
          {SESSION_EXPIRED_MESSAGE}
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p className="status-line" role="status" aria-live="polite">
          마음을 읽고 있어요…
        </p>
      </div>
    );
  }

  if (status === "notfound" || status === "error" || !entry) {
    return (
      <div className="card stack">
        <h1 className="title">결과</h1>
        <p className="error-text" role="alert">
          {status === "notfound" ? "일기를 찾을 수 없어요." : "일기를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."}
        </p>
        <div className="actions">
          {status === "error" && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStatus("loading");
                setReloadKey((k) => k + 1);
              }}
            >
              다시 불러오기
            </button>
          )}
          <Link href="/history" className="btn btn-secondary">
            지난 기록 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1 className="title">오늘의 마음</h1>
      <blockquote className="quote">{entry.content}</blockquote>
      {entry.crisis && <CrisisCard />}
      <section className="card" aria-label="분석 결과" aria-live="polite">
        <EntryAnalysis
          entry={entry}
          onReanalyze={reanalyze}
          busy={busy}
          errorMessage={reError}
          showSavedNote
        />
      </section>
      <div className="actions">
        <Link href="/write" className="btn btn-primary">
          새 일기 쓰기
        </Link>
        <Link href="/history" className="btn btn-secondary">
          지난 기록 보기
        </Link>
      </div>
    </div>
  );
}
