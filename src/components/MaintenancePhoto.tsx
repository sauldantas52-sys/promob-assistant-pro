import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function maintenancePhotoPath(value: string) {
  const marker = "/maintenance_photos/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) return decodeURIComponent(value.slice(markerIndex + marker.length));
  return value.startsWith("http://") || value.startsWith("https://") ? null : value;
}

export function MaintenancePhoto({
  pathOrLegacyUrl,
  alt,
  className,
}: {
  pathOrLegacyUrl: string;
  alt: string;
  className?: string;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const path = maintenancePhotoPath(pathOrLegacyUrl);
    if (!path) return;
    let active = true;
    void supabase.storage
      .from("maintenance_photos")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [pathOrLegacyUrl]);

  if (!signedUrl) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center bg-slate-100 text-[8px] text-slate-500`}
      >
        Protegida
      </div>
    );
  }

  return <img src={signedUrl} alt={alt} className={className} />;
}
