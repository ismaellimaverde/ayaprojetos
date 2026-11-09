-- Recoverable removal only. Existing rows, areas and attachments remain unchanged.
ALTER TABLE library_files ADD COLUMN deleted_at timestamptz;
ALTER TABLE library_files ADD COLUMN deleted_by text REFERENCES "user"(id);
ALTER TABLE library_files ADD CONSTRAINT library_files_deletion_pair CHECK ((deleted_at IS NULL) = (deleted_by IS NULL));
CREATE INDEX library_files_trash_scope ON library_files(org_id,project_id,deleted_at);
