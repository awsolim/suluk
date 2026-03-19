'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { removeStudentFromProgram } from '@/app/actions/enrollments';

type RemoveStudentProps = {
  programId: string;
  studentProfileId: string;
  studentName: string;
  programTitle: string;
};

export default function RemoveStudent({
  programId,
  studentProfileId,
  studentName,
  programTitle,
}: RemoveStudentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${studentName} from ${programTitle}?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await removeStudentFromProgram(programId, studentProfileId);

      if (result?.error) {
        alert(result.error);
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
      className="text-destructive hover:text-destructive"
    >
      {loading ? 'Removing...' : 'Remove'}
    </Button>
  );
}
