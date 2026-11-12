// 2026-11-12 12:38 KST
// 결과 화면 자리(PRD 4.5). 2단계 화면 트랙에서 구현.
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <h1>결과</h1>
      <p data-entry-id={id} />
    </main>
  );
}
