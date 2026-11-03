CREATE TABLE module_content (
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 area text NOT NULL,
 schema_version integer NOT NULL DEFAULT 1 CHECK(schema_version=1),
 revision integer NOT NULL CHECK(revision>0),
 fields jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(fields)='object'),
 items jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(items)='array'),
 updated_by text NOT NULL REFERENCES "user"(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(org_id,project_id,area),
 FOREIGN KEY(project_id,org_id) REFERENCES projects(id,org_id)
);
CREATE TABLE module_revisions (
 org_id uuid NOT NULL,
 project_id uuid NOT NULL,
 area text NOT NULL,
 revision integer NOT NULL,
 schema_version integer NOT NULL,
 fields jsonb NOT NULL,
 items jsonb NOT NULL,
 author_id text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(org_id,project_id,area,revision),
 FOREIGN KEY(org_id,project_id,area) REFERENCES module_content(org_id,project_id,area)
);
ALTER TABLE module_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_revisions ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION prevent_module_revision_change() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Module revisions are append-only'; END;
$$;
CREATE TRIGGER module_revisions_immutable BEFORE UPDATE OR DELETE ON module_revisions
 FOR EACH ROW EXECUTE FUNCTION prevent_module_revision_change();
