import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-black">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Your Physical Therapist
        </h1>
        <p className="max-w-md text-lg text-gray-600 dark:text-gray-400">
          Track your workouts, monitor your progress, and achieve your recovery goals.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
