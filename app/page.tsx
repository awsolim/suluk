export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Suluk</h1>
      <p className="mt-2 text-sm text-gray-600">
        Multi-tenant platform for masajid.
      </p>

      <div className="mt-6 flex gap-3">
        <a href="/login" className="rounded-md border px-4 py-2">
          Log in
        </a>
        <a href="/signup" className="rounded-md border px-4 py-2">
          Sign up
        </a>
      </div>
    </main>
  );
}