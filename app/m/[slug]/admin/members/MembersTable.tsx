"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  changeMemberRole,
  toggleCanManagePrograms,
  removeMemberFromMosque,
} from "@/app/actions/members";
import { MoreHorizontalIcon } from "lucide-react";

type Member = {
  id: string;
  mosque_id: string;
  profile_id: string;
  role: string;
  can_manage_programs: boolean;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
};

type MembersTableProps = {
  members: Member[];
  mosqueId: string;
  currentProfileId: string;
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  lead_teacher: "Lead Teacher",
  mosque_admin: "Admin",
};

const ROLE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  mosque_admin: "default",
  lead_teacher: "default",
  teacher: "secondary",
  student: "outline",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberRow({
  member,
  mosqueId,
  currentProfileId,
}: {
  member: Member;
  mosqueId: string;
  currentProfileId: string;
}) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [isPending, startTransition] = useTransition();

  const isSelf = member.profile_id === currentProfileId;
  const isTeacherOrLead =
    member.role === "teacher" || member.role === "lead_teacher";

  function handleChangeRole() {
    startTransition(async () => {
      const result = await changeMemberRole(member.id, mosqueId, selectedRole);
      if (result.error) {
        alert(result.error);
      }
      setRoleDialogOpen(false);
    });
  }

  function handleTogglePrograms() {
    startTransition(async () => {
      const result = await toggleCanManagePrograms(member.id, mosqueId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMemberFromMosque(member.id, mosqueId);
      if (result.error) {
        alert(result.error);
      }
      setRemoveDialogOpen(false);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(member.profile.full_name)}
          </div>
          <span className="font-medium">
            {member.profile.full_name || "Unnamed"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.profile.email || "--"}
      </TableCell>
      <TableCell>
        <Badge variant={ROLE_VARIANTS[member.role] ?? "outline"}>
          {ROLE_LABELS[member.role] ?? member.role}
        </Badge>
      </TableCell>
      <TableCell>
        {isSelf ? (
          <span className="text-xs text-muted-foreground">You</span>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" />
                }
              >
                <MoreHorizontalIcon />
                <span className="sr-only">Actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedRole(member.role);
                    setRoleDialogOpen(true);
                  }}
                >
                  Change Role
                </DropdownMenuItem>
                {isTeacherOrLead && (
                  <DropdownMenuItem
                    onSelect={() => setProgramDialogOpen(true)}
                  >
                    Toggle Program Management
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setRemoveDialogOpen(true)}
                >
                  Remove from Mosque
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Change Role Dialog */}
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Role</DialogTitle>
                  <DialogDescription>
                    Select a new role for{" "}
                    {member.profile.full_name || "this member"}.
                  </DialogDescription>
                </DialogHeader>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="mosque_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button
                    onClick={handleChangeRole}
                    disabled={isPending || selectedRole === member.role}
                  >
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Toggle Program Management Dialog */}
            <Dialog
              open={programDialogOpen}
              onOpenChange={setProgramDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Program Management</DialogTitle>
                  <DialogDescription>
                    Allow {member.profile.full_name || "this teacher"} to manage
                    programs.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm">Can manage programs</span>
                  <Switch
                    checked={member.can_manage_programs}
                    onCheckedChange={handleTogglePrograms}
                    disabled={isPending}
                  />
                </div>
                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>

            {/* Remove Confirmation */}
            <AlertDialog
              open={removeDialogOpen}
              onOpenChange={setRemoveDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove{" "}
                    {member.profile.full_name || "this member"} from the mosque?
                    This will also remove their enrollments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={isPending}
                  >
                    {isPending ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function MembersTable({
  members,
  mosqueId,
  currentProfileId,
}: MembersTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          No members have joined this mosque yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              mosqueId={mosqueId}
              currentProfileId={currentProfileId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
