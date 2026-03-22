"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/app/actions/profile";

interface PersonalInfoFormProps {
  profile: {
    full_name: string;
    email: string;
    phone_number: string | null;
  };
  slug: string;
  primaryColor: string;
}

export function PersonalInfoForm({ profile, slug, primaryColor }: PersonalInfoFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await updateProfile(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Profile updated successfully.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={profile.email}
            disabled
            className="opacity-60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone Number</Label>
        <Input
          id="phone_number"
          name="phone_number"
          type="tel"
          defaultValue={profile.phone_number || ""}
        />
      </div>

      <Button
        type="submit"
        style={{ backgroundColor: primaryColor }}
        className="text-white"
      >
        Save Changes
      </Button>
    </form>
  );
}
