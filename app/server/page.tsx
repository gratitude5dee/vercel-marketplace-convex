import Link from "next/link";

export default function ServerPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-3xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Server Route</h1>
        <p className="text-slate-600 mt-2">
          This route is reserved for future server-rendered operational views.
        </p>
        <Link className="text-blue-700 underline mt-4 inline-block" href="/">
          Back to MorphicFields home
        </Link>
      </div>
    </main>
  );
}
