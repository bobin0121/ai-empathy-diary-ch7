// 2026-11-12 13:14 KST
// 위기 안내 카드. 문구와 번호는 앱에 고정된 값만 쓴다(PRD 5.2 F5, lib/types.ts 의 CRISIS_CONTACTS).
import { CRISIS_CONTACTS } from "@/lib/types";

export function CrisisCard() {
  return (
    <section className="crisis-card" aria-labelledby="crisis-title">
      <h2 id="crisis-title" className="crisis-card__title">
        많이 힘드시군요. 혼자 견디지 않으셔도 괜찮아요. 지금 이야기를 나눌 수 있는 곳이에요.
      </h2>
      <ul className="crisis-card__list">
        {CRISIS_CONTACTS.map((c) => (
          <li key={c.number} className="crisis-card__item">
            <span>{c.name}</span>
            <a className="crisis-card__tel" href={`tel:${c.number.replace(/-/g, "")}`}>
              {c.number}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
