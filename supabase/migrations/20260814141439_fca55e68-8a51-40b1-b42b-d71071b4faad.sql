-- RLS policies for storage.objects in maintenance_photos bucket
create policy "Authenticated users can upload photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'maintenance_photos');

create policy "Authenticated users can view photos"
on storage.objects for select to authenticated
using (bucket_id = 'maintenance_photos');

create policy "Authenticated users can update their photos"
on storage.objects for update to authenticated
using (bucket_id = 'maintenance_photos');

create policy "Authenticated users can delete their photos"
on storage.objects for delete to authenticated
using (bucket_id = 'maintenance_photos');