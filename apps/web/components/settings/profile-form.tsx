"use client";

import { useActionState, useState, useRef } from "react";
import { updateProfile, type ProfileActionResult } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UPLOAD_LIMITS, ALLOWED_IMAGE_TYPES } from "@/lib/validators/upload";
import { HONORIFICS } from "@academia-alexandria/shared";
import { InstitutionPicker } from "@/components/ui/institution-picker";
import { Loader2, Camera } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface ResearchArea {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface ProfileFormProps {
  user: {
    name: string;
    honorific: string | null;
    bio: string | null;
    institution: string | null;
    rorId: string | null;
    researchAreaIds: string[];
    avatarUrl?: string | null;
  };
  allResearchAreas: ResearchArea[];
}

export function ProfileForm({ user, allResearchAreas }: ProfileFormProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    user.researchAreaIds,
  );

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.avatarUrl ?? null,
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarError(null);
    if (!file) return;

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError("Only JPEG, PNG, WebP, and GIF images are allowed");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    if (file.size > UPLOAD_LIMITS.AVATAR_MAX) {
      setAvatarError(`Image too large. Maximum size: ${Math.round(UPLOAD_LIMITS.AVATAR_MAX / (1024 * 1024))} MB`);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const [state, formAction, isPending] = useActionState<
    ProfileActionResult,
    FormData
  >(async (_prev, formData) => {
    // Upload avatar first if selected
    if (avatarFile) {
      setIsUploading(true);
      try {
        const uploadData = new FormData();
        uploadData.set("file", avatarFile);

        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          body: uploadData,
        });

        if (!res.ok) {
          const body = await res.json();
          setIsUploading(false);
          return { error: body.error || "Avatar upload failed" };
        }
      } catch {
        setIsUploading(false);
        return { error: "Avatar upload failed" };
      }
      setIsUploading(false);
      setAvatarFile(null);
    }

    return updateProfile(formData);
  }, {});

  // Group research areas by parent
  const parentAreas = allResearchAreas.filter((a) => !a.parentId);
  const childrenByParent = new Map<string, ResearchArea[]>();
  for (const area of allResearchAreas) {
    if (area.parentId) {
      const children = childrenByParent.get(area.parentId) ?? [];
      children.push(area);
      childrenByParent.set(area.parentId, children);
    }
  }

  const groups = parentAreas.map((parent) => ({
    label: parent.name,
    items: (childrenByParent.get(parent.id) ?? []).map((child) => ({
      value: child.id,
      label: child.name,
    })),
  }));

  return (
    <form action={formAction} className="space-y-10">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarPreview && (
                <AvatarImage src={avatarPreview} alt={user.name} />
              )}
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <label
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Camera className="h-3.5 w-3.5" />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </label>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Click the camera icon to upload a new photo.</p>
            <p>JPEG, PNG, WebP, or GIF. Max {Math.round(UPLOAD_LIMITS.AVATAR_MAX / (1024 * 1024))} MB.</p>
          </div>
        </div>
        {avatarError && (
          <p className="text-sm text-destructive">{avatarError}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Title / Honorific</Label>
        <Select name="honorific" defaultValue={user.honorific ?? "none"}>
          <SelectTrigger className="w-full max-w-[200px]">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {HONORIFICS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          required
          minLength={2}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={user.bio ?? ""}
          placeholder="Tell the community about yourself and your research..."
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="institution">Institution</Label>
        <InstitutionPicker
          defaultInstitution={user.institution}
          defaultRorId={user.rorId}
        />
      </div>

      <div className="space-y-3">
        <Label>Research Areas</Label>
        <p className="text-sm text-muted-foreground">
          Select up to 10 research areas that match your expertise.
        </p>
        <MultiSelectDropdown
          groups={groups}
          selected={selectedAreas}
          onChange={setSelectedAreas}
          inputName="researchAreaIds"
          max={10}
          placeholder="Select research areas..."
        />
      </div>

      <Button type="submit" disabled={isPending || isUploading}>
        {(isPending || isUploading) && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isUploading ? "Uploading..." : "Save Changes"}
      </Button>
    </form>
  );
}
