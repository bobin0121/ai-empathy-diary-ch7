// 2026-11-12 12:38 KST
// 일기 쓰기 화면(PRD 4.4). 한 줄 입력, 글자 수, 저장 중과 오류 상태.
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createEntry } from "@/components/api-client";
import { SESSION_EXPIRED_MESSAGE, useSessionExpired } from "@/components/use-session-expired";
import { CONTENT_MAX_LENGTH } from "@/lib/types";

export default function WritePage() {
  const router = useRouter();
  const { expired, handleUnauthorized } = useSessionExpired();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 10초가 넘게 걸리면 문구를 바꾼다.
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setSlow(true), 10_000);
    return () => clearTimeout(timer);
  }, [saving]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || expired) return;
    // 줄바꿈은 공백으로, 앞뒤 공백은 지운다(서버도 같은 규칙으로 다시 검사한다).
    const content = text.replace(/\s*[\r\n]+\s*/g, " ").trim();
    if (!content) {
      setError("한 줄을 적어 주세요.");
      return;
    }
    setError(null);
    setSlow(false);
    setSaving(true);
    try {
      const entry = await createEntry(content);
      router.push(`/result/${entry.id}`);
    } catch (err) {
      setSaving(false);
      if (handleUnauthorized(err)) return;
      setError("일기를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  }

  const isError = Boolean(error) || expired;
  const message = expired
    ? SESSION_EXPIRED_MESSAGE
    : saving
      ? slow
        ? "조금만 더 기다려 주세요."
        : "마음을 읽고 있어요…"
      : (error ?? "");

  return (
    <div className="card">
      <h1 className="title">오늘은 어땠나요?</h1>
      <form onSubmit={onSubmit} className="stack" noValidate>
        <label htmlFor="diary-text" className="label">
          오늘의 한 줄
        </label>
        <input
          id="diary-text"
          className="input"
          type="text"
          value={text}
          maxLength={CONTENT_MAX_LENGTH}
          placeholder="오늘 있었던 일을 한 줄로 적어 보세요."
          autoComplete="off"
          readOnly={saving}
          aria-describedby="diary-count diary-message"
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
        />
        <p id="diary-count" className="counter">
          {text.length}/{CONTENT_MAX_LENGTH}
        </p>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={saving || expired || text.trim() === ""}
        >
          기록하기
        </button>
        <p
          id="diary-message"
          className={isError ? "status-line error-text" : "status-line"}
          role={isError ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      </form>
    </div>
  );
}
