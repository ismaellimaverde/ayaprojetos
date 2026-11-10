-- Project file manager, separate from planning content and historical sources.
CREATE TABLE library_folders (
 id uuid PRIMARY KEY,
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 area text NOT NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,org_id,project_id,area),
 FOREIGN KEY(project_id,org_id) REFERENCES projects(id,org_id)
);
CREATE INDEX library_folders_scope ON library_folders(org_id,project_id,area);
CREATE TABLE library_files (
 id uuid PRIMARY KEY,
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 folder_id uuid NOT NULL,
 area text NOT NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 category text NOT NULL CHECK(category IN ('image','video','document')),
 url text NOT NULL DEFAULT '',
 filename text NOT NULL DEFAULT '',
 mime text NOT NULL DEFAULT '',
 attachment bytea,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(folder_id,org_id,project_id,area) REFERENCES library_folders(id,org_id,project_id,area),
 CHECK((attachment IS NULL AND url LIKE 'https://%') OR (attachment IS NOT NULL AND url='' AND category<>'video')),
 CHECK(attachment IS NULL OR octet_length(attachment)<=2097152)
);
CREATE INDEX library_files_scope ON library_files(org_id,project_id,area,folder_id);
ALTER TABLE library_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_files ENABLE ROW LEVEL SECURITY;
