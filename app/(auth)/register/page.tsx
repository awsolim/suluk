import AuthForm from "@/components/auth/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-6">
      <AuthForm mode="register" />
    </main>
  );
}
