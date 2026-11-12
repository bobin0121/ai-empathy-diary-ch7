// 2026-11-12 13:14 KST
// 일기 하나의 분석 부분. 감정(이모지, 이름, 강도)과 공감 메시지, 또는 AI 실패 안내와 "다시 분석하기".
// 결과 화면과 지난 기록 카드가 함께 쓴다. 글은 React 가 글자 그대로 그린다(HTML 로 해석하지 않음).
import { EMOTION_EMOJI, type Entry } from "@/lib/types";

interface Props {
  entry: Entry;
  onReanalyze: () => void;
  busy: boolean;
  errorMessage?: string | null;
  /** 결과 화면에서만 "일기는 안전하게 저장되었어요." 를 함께 보인다. */
  showSavedNote?: boolean;
}

export function EntryAnalysis({ entry, onReanalyze, busy, errorMessage, showSavedNote }: Props) {
  const { emotion, intensity, empathyMessage } = entry;

  if (entry.aiStatus === "done" && emotion && intensity && empathyMessage) {
    return (
      <div>
        <p className="emotion" data-emotion={emotion}>
          <span aria-hidden="true" className="emotion__emoji">
            {EMOTION_EMOJI[emotion]}
          </span>
          <span className="emotion__name">{emotion}</span>
          <span className="emotion__intensity">
            강도 {intensity}/5
            <span aria-hidden="true" className="dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= intensity ? "dot dot--on" : "dot"} />
              ))}
            </span>
          </span>
        </p>
        <p className="empathy">{empathyMessage}</p>
      </div>
    );
  }

  return (
    <div className="notice">
      <p>지금은 AI 응답을 받지 못했어요. 잠시 뒤 다시 분석해 주세요.</p>
      {entry.crisis && <p>오늘 이 마음을 적어 주셔서 고마워요. 당신의 이야기를 소중히 듣고 있어요.</p>}
      {showSavedNote && <p>일기는 안전하게 저장되었어요.</p>}
      <button type="button" className="btn btn-secondary" onClick={onReanalyze} disabled={busy}>
        {busy ? "다시 분석하는 중이에요…" : "다시 분석하기"}
      </button>
      <p className="error-text" role="alert">
        {errorMessage ?? ""}
      </p>
    </div>
  );
}
