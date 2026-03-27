import Link from "next/link";
import {
  getAllMosques,
  getMembershipsForUser,
  getProfileForCurrentUser,
  getTeacherRequestsForUser,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { JoinAsTeacherButton } from "@/components/masjid/JoinAsTeacherButton";
import { StopPropagation } from "@/components/StopPropagation";

const DEFAULT_MOSQUE_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="32" fill="#f3f4f6" />
      <path d="M100 42c-24 0-44 20-44 44v58h88V86c0-24-20-44-44-44Z" fill="#d1d5db" />
      <path d="M78 144V98h44v46" fill="#9ca3af" />
      <circle cx="100" cy="32" r="10" fill="#9ca3af" />
    </svg>
  `);

export default async function HomePage() {
  const supabase = await createClient();
  const mosques = await getAllMosques();

  let profile = null;
  try {
    profile = await getProfileForCurrentUser();
  } catch {
    // Corrupted auth session — treat as logged out
  }
  const isLoggedIn = !!profile;

  const userMemberships = isLoggedIn && profile
    ? await getMembershipsForUser(profile.id)
    : [];
  const memberMosqueIds = new Set(userMemberships.map((m) => m.mosque_id));

  const teacherRequests = isLoggedIn && profile
    ? await getTeacherRequestsForUser(profile.id)
    : [];
  const teacherRequestByMosque = new Map(
    teacherRequests.map((r) => [r.mosque_id, r.status])
  );

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Masjid Directory</h1>
        <p className="text-sm text-gray-600">
          Open a mosque portal to continue.
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        {isLoggedIn ? (
          <Link
            href="/create-masjid"
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Create a Masjid
          </Link>
        ) : (
          <Link
            href="/signup"
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Sign Up
          </Link>
        )}
      </div>

      {mosques.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            No mosques have been added yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {mosques.map((mosque) => {
            const mosqueLogoSrc = mosque.logo_url
              ? supabase.storage
                  .from("media")
                  .getPublicUrl(mosque.logo_url).data.publicUrl
              : DEFAULT_MOSQUE_LOGO;

            return (
              <Link
                key={mosque.id}
                href={`/m/${mosque.slug}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    <img
                      src={mosqueLogoSrc}
                      alt={mosque.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      {mosque.name}
                    </h2>
                    <p className="text-sm text-gray-500">/{mosque.slug}</p>
                  </div>

                  {isLoggedIn && !memberMosqueIds.has(mosque.id) ? (
                    <StopPropagation className="ml-auto shrink-0">
                      <JoinAsTeacherButton
                        mosqueId={mosque.id}
                        initialStatus={teacherRequestByMosque.get(mosque.id) ?? null}
                      />
                    </StopPropagation>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}