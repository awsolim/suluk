import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
  roleLabel: string;
  primaryColor: string;
}

export function ProfileCard({ profile, roleLabel, primaryColor }: ProfileCardProps) {
  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl p-6"
      style={{ backgroundColor: `${primaryColor}12` }}
    >
      <div className="h-20 w-20">
        <Avatar className="h-full w-full">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{profile.full_name}</p>
        <p className="text-sm text-muted-foreground">{roleLabel}</p>
      </div>
      <Badge variant="outline" className="uppercase">
        {roleLabel}
      </Badge>
    </div>
  );
}
