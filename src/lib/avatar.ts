/* Public URL for an avatar stored in the public 'avatars' bucket. */
export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}
