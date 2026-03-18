"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";

type EditProfileFormProps = {
  slug: string;
  initialName: string;
  initialAvatarSrc: string;
  primaryColor: string;
  initialPhoneNumber?: string | null;
  initialAge?: number | null;
  initialGender?: string | null;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create image editor.");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function EditProfileForm({
  slug,
  initialName,
  initialAvatarSrc,
  primaryColor,
  initialPhoneNumber,
  initialAge,
  initialGender,
}: EditProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || "");
  const [age, setAge] = useState(initialAge ? String(initialAge) : "");
  const [gender, setGender] = useState(initialGender || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [avatarPreviewSrc] = useState(initialAvatarSrc);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const hasNewImage = Boolean(selectedImageSrc);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const previewLabel = useMemo(() => {
    return hasNewImage ? "New avatar preview" : "Current avatar";
  }, [hasNewImage]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    setErrorMessage("");

    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  function handleRemoveNewImage() {
    setSelectedImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("slug", slug);
        formData.append("fullName", fullName.trim());
        formData.append("phoneNumber", phoneNumber.trim());
        formData.append("age", age.trim());
        formData.append("gender", gender);

        if (selectedImageSrc && croppedAreaPixels) {
          const croppedBlob = await getCroppedBlob(
            selectedImageSrc,
            croppedAreaPixels
          );

          const croppedFile = new File([croppedBlob], "avatar.jpg", {
            type: "image/jpeg",
          });

          formData.append("avatar", croppedFile);
        }

        const result = await updateProfile(formData);

        if (result?.error) {
          setErrorMessage(result.error);
          return;
        }

        router.push(`/m/${slug}/settings`);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not update profile."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Profile Photo</h2>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <img
              src={avatarPreviewSrc}
              alt={previewLabel}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{previewLabel}</p>
            <p className="mt-1 text-sm text-gray-500">
              Upload a square-friendly photo.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="avatar"
            className="block text-sm font-medium text-gray-900"
          >
            Choose New Photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700"
          />
        </div>

        {selectedImageSrc ? (
          <div className="mt-4 space-y-4">
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={selectedImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div>
              <label
                htmlFor="zoom"
                className="block text-sm font-medium text-gray-900"
              >
                Zoom
              </label>
              <input
                id="zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleRemoveNewImage}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
            >
              Remove New Photo
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Profile Information</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-900"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-900"
            >
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
              placeholder="Your phone number"
              required
            />
          </div>

          <div>
            <label
              htmlFor="age"
              className="block text-sm font-medium text-gray-900"
            >
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min="1"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
              placeholder="Your age"
              required
            />
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-900"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none focus:border-black"
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
<option value="female">Female</option>
            </select>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}