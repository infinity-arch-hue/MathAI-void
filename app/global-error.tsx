'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-center">
          <h2 className="text-xl font-bold mb-2 text-rose-600">Application Error</h2>
          <p className="text-sm text-slate-600 mb-6">
            A critical error occurred. Please reload to restore the session.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
