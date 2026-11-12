// 2026-11-12 12:38 KST
// 지난 기록 화면(PRD 4.6). 최근 것부터 20개씩, 더 보기, 빈 상태, 삭제(확인 창), 도움 받을 곳, 다시 분석하기.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { analyzeEntry, ApiError, deleteEntry, listEntries } from "@/components/api-client";
import { DeleteDialog } from "@/components/confirm-dialog";
import { CrisisCard } from "@/components/crisis-card";
import { EntryAnalysis } from "@/components/entry-analysis";
import { formatKst } from "@/components/format";
import { SESSION_EXPIRED_MESSAGE, useSessionExpired } from "@/components/use-session-expired";
import type { Entry } from "@/lib/types";

type Status = "loading" | "ready" | "error";

export default function HistoryPage() {
  const { expired, handleUnauthorized } = useSessionExpired();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  const [helpOpen, setHelpOpen] = useState<Set<string>>(new Set());
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [reErrors, setReErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listEntries()
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setNextCursor(data.nextCursor);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || handleUnauthorized(err)) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, handleUnauthorized]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const data = await listEntries(nextCursor);
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      if (!handleUnauthorized(err)) setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function reanalyze(id: string) {
    setReanalyzing(id);
    setReErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const updated = await analyzeEntry(id);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      if (handleUnauthorized(err)) return;
      const message =
        err instanceof ApiError && err.status === 404
          ? "일기를 찾을 수 없어요."
          : "다시 분석하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
      setReErrors((prev) => ({ ...prev, [id]: message }));
    } finally {
      setReanalyzing(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeleteTarget(null);
      setNotice("일기를 삭제했어요.");
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setDeleteTarget(null);
      if (handleUnauthorized(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        // 이미 지워졌거나 내 것이 아님: 목록에서만 치운다.
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
      setDeleteError("삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setDeleting(false);
    }
  }

  function toggleHelp(id: string) {
    setHelpOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  return (
    <div className="stack">
      <h1 className="title">지난 기록</h1>

      <p className="status-line" role="status" aria-live="polite">
        {notice ?? ""}
      </p>
      {deleteError && (
        <p className="error-text" role="alert">
          {deleteError}
        </p>
      )}

      {status === "loading" && (
        <div aria-busy="true">
          <p className="status-line" role="status" aria-live="polite">
            기록을 불러오는 중이에요.
          </p>
          <ul className="list" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <li key={n} className="card skeleton" />
            ))}
          </ul>
        </div>
      )}

      {status === "error" && (
        <div className="card stack">
          <p className="error-text" role="alert">
            기록을 불러오지 못했어요.
          </p>
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
        </div>
      )}

      {status === "ready" && entries.length === 0 && (
        <div className="card stack">
          <p className="lead">아직 쓴 일기가 없어요. 오늘의 한 줄을 남겨 볼까요?</p>
          <Link href="/write" className="btn btn-primary">
            일기 쓰러 가기
          </Link>
        </div>
      )}

      {status === "ready" && entries.length > 0 && (
        <ul className="list">
          {entries.map((entry) => (
            <li key={entry.id} className="card entry">
              <time className="entry__time" dateTime={entry.createdAt}>
                {formatKst(entry.createdAt)}
              </time>
              <p className="entry__content">{entry.content}</p>
              {entry.crisis && helpOpen.has(entry.id) && <CrisisCard />}
              <EntryAnalysis
                entry={entry}
                onReanalyze={() => reanalyze(entry.id)}
                busy={reanalyzing === entry.id}
                errorMessage={reErrors[entry.id]}
              />
              <div className="actions">
                {entry.crisis && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-expanded={helpOpen.has(entry.id)}
                    onClick={() => toggleHelp(entry.id)}
                  >
                    도움 받을 곳
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(entry.id);
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "ready" && nextCursor && (
        <div className="stack">
          <button type="button" className="btn btn-secondary btn-block" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "불러오는 중…" : "더 보기"}
          </button>
          {moreError && (
            <p className="error-text" role="alert">
              기록을 불러오지 못했어요.
            </p>
          )}
        </div>
      )}

      <DeleteDialog
        open={deleteTarget !== null}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
