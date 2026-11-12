// 2026-11-12 13:14 KST
// 서버가 준 UTC 시각 문자열을 한국 시각으로 바꿔 보인다(docs/API.md 1항).
export function formatKst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
