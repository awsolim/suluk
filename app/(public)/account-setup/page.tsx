/**
 * Shown when a signed-in user exists but their profile/role is missing.
 * This should be rare, but it's better UX than redirecting back to /login.
 */
export default function AccountSetupPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-black">Account setup issue</h1>
        <p className="mt-2 text-sm text-black/80">
          Your account exists, but your program profile hasn’t been created yet.
          Please contact an administrator or try signing out and signing in again.
        </p>
      </div>
    </div>
  );
}
