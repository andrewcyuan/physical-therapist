import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
              PT
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Your Physical Therapist
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <span className="hidden cursor-default text-slate-500 sm:inline">
              Product
            </span>
            <span className="hidden cursor-default text-slate-500 sm:inline">
              How it works
            </span>
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr,1fr] md:items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built for long-haul rehab, not one-off workouts
            </div>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Computer vision for
                <span className="block text-slate-500">
                  every rep your therapist cares about.
                </span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Record your own exercises once. Run them anywhere with automatic rep
                counting, phase detection, and simple, honest progress.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Get started in the app
              </Link>
              <button className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900">
                See how sessions feel
              </button>
            </div>

            <div className="grid gap-4 text-xs text-slate-600 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Rep engine</p>
                <p className="mt-1">
                  Counts, times, and tags each rep using your own template recording.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Joint awareness</p>
                <p className="mt-1">
                  Hips, knees, shoulders, and more tracked in real time from camera.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Session structure</p>
                <p className="mt-1">
                  Programs built from sets, not vibes, so rehab is repeatable.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Example rehab session
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    ACL return-to-run block
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  Live rep tracking
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-600">
                <div>
                  <p className="text-slate-500">Total reps</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">24</p>
                </div>
                <div>
                  <p className="text-slate-500">Average depth</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">91°</p>
                </div>
                <div>
                  <p className="text-slate-500">Tempo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    2–1–2
                  </p>
                </div>
              </div>

              <div className="mt-4 h-20 rounded-xl bg-slate-50 p-2">
                <div className="flex h-full items-end gap-1">
                  <div className="h-[30%] flex-1 rounded-full bg-slate-300" />
                  <div className="h-[65%] flex-1 rounded-full bg-slate-900" />
                  <div className="h-[55%] flex-1 rounded-full bg-slate-600" />
                  <div className="h-[40%] flex-1 rounded-full bg-slate-300" />
                  <div className="h-[70%] flex-1 rounded-full bg-slate-900" />
                  <div className="h-[45%] flex-1 rounded-full bg-slate-600" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>Rep quality over time</span>
                <span>Template: single-leg squat</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-medium text-slate-900">
                What you get after setup
              </p>
              <p className="mt-1">
                A small library of exercises built from your own recordings, each
                with rep counting and phase detection automatically wired in.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
