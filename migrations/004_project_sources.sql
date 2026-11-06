-- Private source library; never mixed into module_content or exported document JSON.
CREATE TABLE project_sources (
 id uuid PRIMARY KEY,
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 area text NOT NULL,
 name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('image','audio','pdf','link','book')),
 origin text NOT NULL DEFAULT '',
 note text NOT NULL DEFAULT '',
 url text NOT NULL DEFAULT '',
 filename text NOT NULL DEFAULT '',
 mime text NOT NULL DEFAULT '',
 attachment bytea,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,org_id,project_id),
 FOREIGN KEY(project_id,org_id) REFERENCES projects(id,org_id),
 CHECK(attachment IS NULL OR octet_length(attachment)<=2097152)
);
CREATE INDEX project_sources_scope ON project_sources(org_id,project_id,area);
CREATE TABLE source_links (
 id uuid PRIMARY KEY,
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 source_id uuid NOT NULL,
 area text NOT NULL,
 field text NOT NULL DEFAULT '',
 quote text NOT NULL DEFAULT '',
 quote_hash text NOT NULL CHECK(length(quote_hash)=64),
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(source_id,org_id,project_id) REFERENCES project_sources(id,org_id,project_id),
 UNIQUE(org_id,project_id,source_id,area,field,quote_hash),
 CHECK((field='' AND quote='') OR (field<>'' AND quote<>''))
);
CREATE INDEX source_links_scope ON source_links(org_id,project_id,area);
ALTER TABLE project_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_links ENABLE ROW LEVEL SECURITY;
