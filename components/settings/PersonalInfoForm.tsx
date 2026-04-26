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
    gender: string | null;
    date_of_birth: string | null;
  };
  slug: string;
  primaryColor: string;
  showCompletionBanner?: boolean;
}

export function PersonalInfoForm({ profile, slug, primaryColor, showCompletionBanner }: PersonalInfoFormProps) {
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

      {showCompletionBanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please complete your profile before continuing.
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Profile updated successfully.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
          <select
            id="gender"
            name="gender"
            defaultValue={profile.gender || ""}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Select gender</option>
            <option value="male">Brother</option>
            <option value="female">Sister</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={profile.date_of_birth || ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
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
