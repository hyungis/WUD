import { Link } from "react-router-dom";
import Button from "../../components/shared/Button";
function LandingPage() {
  return (
    <div className="scrollbar-hidden h-screen overflow-y-auto bg-slate-950 text-slate-100">
      <div className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
              About
            </p>
            <h1 className="mt-4 text-4xl font-semibold [font-family:'Manrope',sans-serif]">
              하나의 별에서 은하수로
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate-300">
              감정은 눈에 보이지 않지만, 매일의 기록이 쌓이면 충분히 보일 수 있습니다.
              우리는 감정의 색, 선, 속도, 밀도를 분석해 별과 행성, 별자리를 만들고
              시간이 흐를수록 당신만의 우주가 확장되도록 설계했습니다.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Step 01
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">
                진입 및 최초의 별
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                가입 후 첫 경험은 HTP 검사로 시작됩니다. 네이비 블루의 우주 배경 중앙에
                거대한 흰색 별이 하나 놓이고, 이것이 나의 시작점이 됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Step 02
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">
                데일리 기록으로 별 생성
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                매일 제공되는 질문과 만다라 기반 캔버스를 통해 직관적으로 색과 선을 남깁니다.
                기록이 저장되면, 당신의 감정 색을 띈 데일리 별이 생성됩니다.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
              Step 03
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-100">
              주간 요약과 별자리 완성
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              일주일의 기록은 세 가지 검사로 정리되고, 그 결과가 행성과 우주 환경으로 시각화됩니다.
              흩어진 데일리 별이 연결되어 별자리가 완성되며, 중심에는 위클리 별이 생성됩니다.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm font-semibold text-slate-100">PITR</p>
                <p className="mt-2 text-sm text-slate-300">
                  스트레스와 대처 자원을 측정해 우주 폭풍, 대기권의 강도로 표현합니다.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm font-semibold text-slate-100">SWP</p>
                <p className="mt-2 text-sm text-slate-300">
                  감정선의 파형을 성운과 오로라로 변환하고, 별 배치로 별자리를 구성합니다.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm font-semibold text-slate-100">HTP</p>
                <p className="mt-2 text-sm text-slate-300">
                  집, 나무, 사람 요소를 통합해 행성 지형과 위성 궤도로 표현합니다.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Step 04
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">
                탐색과 상호작용
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                HUD 타임라인으로 특정 주차를 선택하면 카메라가 부드럽게 이동하고,
                데일리 별을 터치하면 그날의 기록과 메모를 바로 확인할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Step 05
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">
                은하수 조망
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                기록이 누적되면 카메라는 더 넓은 시점으로 이동하고,
                수많은 별자리들이 모인 당신만의 은하수를 한 눈에 바라볼 수 있습니다.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                  Start
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  오늘의 감정을 기록하고 첫 별을 만들어 보세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/login">
                  <Button>로그인</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary">회원가입</Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
