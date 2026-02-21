import Link from "next/link";

export default function ServerPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Server Route</h1>
      <p className="text-foreground/60 text-sm">
        This route is reserved for future server-rendered operational views.
      </p>
      <Link href="/" className="text-sm underline underline-offset-2 hover:opacity-80">
        Back to MorphicFields home
      </Link>
    </main>
  );
}
