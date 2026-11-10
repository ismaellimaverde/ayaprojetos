-- Approved conversion of existing material to general project access.
-- Preserve former area as provenance; never use it as a new permission.
-- New API writes project scope explicitly.
-- Keep the legacy default for compatibility during deployment.
ALTER TABLE library_folders ADD COLUMN scope text NOT NULL DEFAULT 'area' CHECK(scope IN ('area','project'));
ALTER TABLE library_files ADD COLUMN scope text NOT NULL DEFAULT 'area' CHECK(scope IN ('area','project'));
ALTER TABLE library_folders ALTER COLUMN area DROP NOT NULL;
ALTER TABLE library_files ALTER COLUMN area DROP NOT NULL;
ALTER TABLE library_folders ADD COLUMN legacy_area text;
ALTER TABLE library_files ADD COLUMN legacy_area text;
-- Clear child references first; the existing composite FK skips NULL area.
UPDATE library_files SET legacy_area=area,area=NULL,scope='project';
UPDATE library_folders SET legacy_area=area,area=NULL,scope='project';
ALTER TABLE library_folders ADD CONSTRAINT library_folder_scope_area CHECK ((scope='project' AND area IS NULL) OR (scope='area' AND area IS NOT NULL));
ALTER TABLE library_files ADD CONSTRAINT library_file_scope_area CHECK ((scope='project' AND area IS NULL) OR (scope='area' AND area IS NOT NULL));
ALTER TABLE library_folders ADD CONSTRAINT library_folder_scope_key UNIQUE(id,org_id,project_id,scope);
ALTER TABLE library_files ADD CONSTRAINT library_file_scope_parent FOREIGN KEY(folder_id,org_id,project_id,scope) REFERENCES library_folders(id,org_id,project_id,scope);
