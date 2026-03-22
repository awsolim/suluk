"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface TagFilterProps {
  tags: string[];
  slug: string;
  primaryColor: string;
}

export function TagFilter({ tags, slug, primaryColor }: TagFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag") || "";

  const handleTagClick = useCallback(
    (tag: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tag === "") {
        params.delete("tag");
      } else {
        params.set("tag", tag);
      }
      router.push(`/m/${slug}/programs?${params.toString()}`);
    },
    [router, searchParams, slug],
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => handleTagClick("")}
        className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        style={
          activeTag === ""
            ? { backgroundColor: primaryColor, color: "white" }
            : { backgroundColor: "var(--muted)", color: "var(--foreground)" }
        }
      >
        All Programs
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => handleTagClick(tag)}
          className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          style={
            activeTag === tag
              ? { backgroundColor: primaryColor, color: "white" }
              : { backgroundColor: "var(--muted)", color: "var(--foreground)" }
          }
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
