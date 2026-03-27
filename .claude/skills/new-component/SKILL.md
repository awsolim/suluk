---
name: new-component
description: Scaffold a new React component in the components directory following project conventions (Tailwind, TypeScript, Server Components by default)
---

# New Component

Create a new React component following this project's conventions.

## Rules

1. **Server Components by default** — only add `'use client'` if the component needs interactivity or browser APIs
2. **TypeScript** — define a `Props` type above the component
3. **Tailwind CSS** — use Tailwind utility classes for all styling, no CSS modules
4. **Default export** — one component per file, default export
5. **Naming** — PascalCase filename matching the component name

## File Location

- Reusable UI primitives (buttons, cards, inputs) → `components/ui/`
- Feature-specific components → `components/<feature>/` (e.g. `components/dashboard/`, `components/programs/`)

## Template

```tsx
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Brief description of what the component does.
 */
export default function ComponentName({ children }: Props) {
  return (
    <div className="">
      {children}
    </div>
  );
}
```

## Checklist

- [ ] Props typed with a `Props` type alias
- [ ] Default export with PascalCase name matching filename
- [ ] Tailwind classes for styling
- [ ] Only `'use client'` if interactive
- [ ] Brief JSDoc comment describing purpose
