// 2026-11-12 13:14 KST
// 삭제 확인 창. 브라우저 기본 <dialog> 를 써서 Esc 취소, 초점 가둠, 뒤 화면 막기가 기본으로 된다(PRD 4.6).
"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function DeleteDialog({ open, onConfirm, onCancel, busy }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
      onCancel={(e) => {
        // Esc 는 취소로만 처리한다. 닫는 일은 open 값이 바뀌며 위 효과가 한다.
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="delete-title" className="dialog__title">
        이 일기를 삭제할까요?
      </h2>
      <p id="delete-desc">삭제하면 되돌릴 수 없어요.</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
          취소
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? "삭제하는 중…" : "삭제하기"}
        </button>
      </div>
    </dialog>
  );
}
