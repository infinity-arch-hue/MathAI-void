import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-sm text-slate-500 mb-4">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Return to MATH AI
      </Link>
    </div>
  );
}
