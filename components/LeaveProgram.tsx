'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { withdrawFromProgram } from '@/app/actions/enrollments';

type LeaveProgramProps = {
  programId: string;
  programTitle: string;
  mosqueSlug: string;
};

export default function LeaveProgram({
  programId,
  programTitle,
  mosqueSlug,
}: LeaveProgramProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLeave() {
    const confirmed = window.confirm(
      `Leave ${programTitle}? You'll lose access to this class.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('slug', mosqueSlug);
      formData.set('programId', programId);
      formData.set('returnTo', `/m/${mosqueSlug}/programs`);

      await withdrawFromProgram(formData);

      router.push(`/m/${mosqueSlug}/programs`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleLeave}
      disabled={loading}
      className="text-destructive border-destructive/30 hover:bg-destructive/10"
    >
      {loading ? 'Leaving...' : 'Leave Program'}
    </Button>
  );
}
