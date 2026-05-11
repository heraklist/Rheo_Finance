import { supabase } from "@/lib/supabase";

export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_current_user");

  if (error) {
    throw error;
  }

  await supabase.auth.signOut();
}
