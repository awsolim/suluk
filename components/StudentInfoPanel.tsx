"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type StudentInfo = {
  name: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  enrollmentDate?: string | null;
};

type StudentInfoPanelProps = {
  student: StudentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatGender(gender: string | null | undefined) {
  if (!gender) return "Not provided";
  if (gender === "male") return "Brother";
  if (gender === "female") return "Sister";
  return gender;
}

export default function StudentInfoPanel({
  student,
  open,
  onOpenChange,
}: StudentInfoPanelProps) {
  if (!student) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Student Details</SheetTitle>
          <SheetDescription>
            View information about this student.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col items-center gap-3 px-4">
          <Avatar size="lg">
            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
          </Avatar>

          <div className="text-center">
            <p className="text-base font-semibold">{student.name}</p>
            {student.gender ? (
              <Badge variant="secondary" className="mt-1">
                {formatGender(student.gender)}
              </Badge>
            ) : null}
          </div>
        </div>

        <Separator className="mx-4" />

        <div className="space-y-4 px-4 pb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{student.email ?? "Not provided"}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Phone</p>
            <p className="text-sm">{student.phone ?? "Not provided"}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Age</p>
            <p className="text-sm">{student.age ?? "Not provided"}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Gender</p>
            <p className="text-sm">{formatGender(student.gender)}</p>
          </div>

          {student.enrollmentDate ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Enrollment Date
              </p>
              <p className="text-sm">
                {new Date(student.enrollmentDate).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
