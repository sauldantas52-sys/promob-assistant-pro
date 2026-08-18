import { supabase } from "@/integrations/supabase/client";

export async function testChecklistLogic() {
  const projectId = "8321961c-9b09-4300-b594-048ecfa27ac6";
  const checkType = "xml_valido";
  
  console.log("Starting DB Logic Test for Checklist...");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  console.log("Authenticated as:", user.email);
  
  // Try to insert/upsert a check
  const { error: upsertError } = await supabase.from("validation_checks").upsert({
    project_id: projectId,
    check_type: checkType,
    is_completed: true,
    completed_by: user.id,
    completed_at: new Date().toISOString(),
    evidence_source: "promob_xml",
    updated_at: new Date().toISOString(),
  } as any, { onConflict: "project_id,check_type" });
  
  if (upsertError) {
    console.error("Upsert Error:", upsertError);
    return { success: false, error: upsertError };
  }
  
  console.log("Upsert Success. Verifying read...");
  
  const { data: checks, error: readError } = await supabase
    .from("validation_checks")
    .select("*")
    .eq("project_id", projectId)
    .eq("check_type", checkType);
    
  if (readError) {
    console.error("Read Error:", readError);
    return { success: false, error: readError };
  }
  
  console.log("Read Data:", checks);
  return { success: true, data: checks };
}
