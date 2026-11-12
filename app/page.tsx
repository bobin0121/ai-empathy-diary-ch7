// 2026-11-12 12:38 KST
// 시작 화면(PRD 4.3). 이미 로그인했으면 바로 /write 로 보낸다.
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle } from "@/app/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/write");

  // Auth.js 가 로그인 취소나 실패 때 /?error=... 로 돌려보낸다.
  const { error } = await searchParams;

  return (
    <main className="page page--center">
      <div className="card card--hero">
        <p className="hero__emoji" aria-hidden="true">
          📔
        </p>
        <h1 className="title">공감 다이어리</h1>
        <p className="lead">오늘 있었던 일을 한 줄로 적어 보세요. 마음을 읽고 따뜻하게 답해 드릴게요.</p>
        <form action={signInWithGoogle} className="stack">
          {error && (
            <p className="error-text" role="alert">
              로그인에 실패했어요. 다시 시도해 주세요.
            </p>
          )}
          <GoogleSignInButton />
        </form>
        <p className="muted">일기는 본인만 볼 수 있어요.</p>
        <p className="muted small">일기 한 줄은 AI 분석을 위해 외부 AI 서비스로 전달돼요.</p>
      </div>
    </main>
  );
}
