--
-- PostgreSQL database dump
--

\restrict Pju1GNxH4FccTwsrKMJcURTxPFsnKg3Wyo7CD60o4ffk7TAbsfipLfaE8wdRph2

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_namespaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    catalog_id uuid NOT NULL
);


--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace_id uuid NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    remote_table_id text,
    shard_key text,
    shard_id text,
    catalog_id uuid NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
public	public	\N	2026-01-19 19:04:52.806987+00	2026-01-19 19:04:52.806987+00	t	f	\N	\N	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_namespaces (id, bucket_name, name, created_at, updated_at, metadata, catalog_id) FROM stdin;
\.


--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_tables (id, namespace_id, bucket_name, name, location, created_at, updated_at, remote_table_id, shard_key, shard_id, catalog_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-01-05 18:59:01.143697
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-01-05 18:59:01.149596
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2026-01-05 18:59:01.153712
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-01-05 18:59:01.178285
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-01-05 18:59:01.213367
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-01-05 18:59:01.218123
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2026-01-05 18:59:01.227415
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-01-05 18:59:01.241035
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-01-05 18:59:01.244984
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2026-01-05 18:59:01.251803
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2026-01-05 18:59:01.256773
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-01-05 18:59:01.26684
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-01-05 18:59:01.274609
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-01-05 18:59:01.279357
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-01-05 18:59:01.285678
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-01-05 18:59:01.325088
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-01-05 18:59:01.334489
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-01-05 18:59:01.342763
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-01-05 18:59:01.348097
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-01-05 18:59:01.356924
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-01-05 18:59:01.364538
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-01-05 18:59:01.373934
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-01-05 18:59:01.411691
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-01-05 18:59:01.45475
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-01-05 18:59:01.461451
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-01-05 18:59:01.46583
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2026-01-05 18:59:01.471366
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2026-01-05 18:59:01.501375
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2026-01-05 18:59:01.517696
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2026-01-05 18:59:01.523922
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2026-01-05 18:59:01.531369
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2026-01-05 18:59:01.543886
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2026-01-05 18:59:01.562799
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2026-01-05 18:59:01.575726
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2026-01-05 18:59:01.577276
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2026-01-05 18:59:01.587605
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2026-01-05 18:59:01.593034
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-01-05 18:59:01.6061
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2026-01-05 18:59:01.611286
39	add-search-v2-sort-support	39cf7d1e6bf515f4b02e41237aba845a7b492853	2026-01-05 18:59:01.659946
40	fix-prefix-race-conditions-optimized	fd02297e1c67df25a9fc110bf8c8a9af7fb06d1f	2026-01-05 18:59:01.67139
41	add-object-level-update-trigger	44c22478bf01744b2129efc480cd2edc9a7d60e9	2026-01-05 18:59:01.690607
42	rollback-prefix-triggers	f2ab4f526ab7f979541082992593938c05ee4b47	2026-01-05 18:59:01.698205
43	fix-object-level	ab837ad8f1c7d00cc0b7310e989a23388ff29fc6	2026-01-05 18:59:01.705191
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-01-05 18:59:01.709224
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-01-05 18:59:01.713501
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-01-05 18:59:01.757321
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-01-05 18:59:01.762976
48	iceberg-catalog-ids	2666dff93346e5d04e0a878416be1d5fec345d6f	2026-01-05 18:59:01.76684
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-01-05 18:59:01.837347
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
dc34118b-5c4d-450b-8418-50302adae0be	public	products/1769797762855-17697977441352897128593167181177.webp	\N	2026-01-30 18:29:25.905291+00	2026-01-30 18:29:25.905291+00	2026-01-30 18:29:25.905291+00	{"eTag": "\\"ee312c8d0c382a9f54e8b4d194c9e299\\"", "size": 145332, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:29:25.891Z", "contentLength": 145332, "httpStatusCode": 200}	f9394041-a2b6-4de2-8aff-1f0a50af5de9	\N	{}	2
11090441-91a0-40b5-8ebf-ee3ca6c74920	public	products/1769870611620-176987060120262221899952497395.webp	\N	2026-01-31 14:43:32.891788+00	2026-01-31 14:43:32.891788+00	2026-01-31 14:43:32.891788+00	{"eTag": "\\"d38327ff5ca62baf63f0deb317c45c0c\\"", "size": 129294, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:43:32.884Z", "contentLength": 129294, "httpStatusCode": 200}	8d4af482-40ec-4c18-9363-999aedd11e8d	\N	{}	2
363231f4-3659-4231-9e28-956445dd9011	public	products/1769799002354-17697989882643708964260948058529.webp	\N	2026-01-30 18:50:06.204022+00	2026-01-30 18:50:06.204022+00	2026-01-30 18:50:06.204022+00	{"eTag": "\\"7ed7762533437e673d97f7844ed8b10e\\"", "size": 192634, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:50:06.091Z", "contentLength": 192634, "httpStatusCode": 200}	3914da3a-499c-4a3f-8183-ee6ba3ebe11f	\N	{}	2
311fc7bd-8b91-4d28-a1ec-c3d30fd3aa3d	public	products/1769884034720-17698840114784980774889088388101.webp	\N	2026-01-31 18:27:16.416675+00	2026-01-31 18:27:16.416675+00	2026-01-31 18:27:16.416675+00	{"eTag": "\\"14aaf36dee15900c512b711b6dcd4c63\\"", "size": 147424, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:27:16.403Z", "contentLength": 147424, "httpStatusCode": 200}	e44329e2-6a9a-4cbf-b5b6-6568aacf5821	\N	{}	2
56a4e386-1b5a-4608-8b8c-dab223e7c2fe	public	products/1769799131683-17697991165855532355033932581528.webp	\N	2026-01-30 18:52:14.202414+00	2026-01-30 18:52:14.202414+00	2026-01-30 18:52:14.202414+00	{"eTag": "\\"0fd22fd260b1486a6e8055e3a60025db\\"", "size": 229886, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:52:14.187Z", "contentLength": 229886, "httpStatusCode": 200}	6f4a6c90-994c-4b1a-9a89-09b110d03ac3	\N	{}	2
eac70daa-5ee7-48d9-a341-4c75ca72ab67	public	products/1769871886360-17698718676883980760632006285215.webp	\N	2026-01-31 15:04:47.10838+00	2026-01-31 15:04:47.10838+00	2026-01-31 15:04:47.10838+00	{"eTag": "\\"8e29b5873b06c42a131748b8fc6b5e63\\"", "size": 116504, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:04:47.094Z", "contentLength": 116504, "httpStatusCode": 200}	a7447b43-95d0-43c4-9581-1142590ecf96	\N	{}	2
09d00d16-3173-4d8a-8185-3e83a7968dd6	public	products/1769799623363-17697996117016922402142199029217.webp	\N	2026-01-30 19:00:27.211567+00	2026-01-30 19:00:27.211567+00	2026-01-30 19:00:27.211567+00	{"eTag": "\\"2593ac3a9ac142aa94527639a7763e15\\"", "size": 168986, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:00:27.188Z", "contentLength": 168986, "httpStatusCode": 200}	5ff95b6f-bc6d-4ef5-be64-95535cc24c3e	\N	{}	2
47220d0a-bfab-4728-91e6-113a74ba5043	public	products/1769800171847-1769800128859831387508508058508.webp	\N	2026-01-30 19:09:34.399385+00	2026-01-30 19:09:34.399385+00	2026-01-30 19:09:34.399385+00	{"eTag": "\\"7eac8aa9797aa7d3d6ce28e436861ea0\\"", "size": 87652, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:09:34.390Z", "contentLength": 87652, "httpStatusCode": 200}	6dc3fd33-a127-4031-bacb-dcdf07e2940b	\N	{}	2
33061c29-1d18-4785-98c0-e23141bce8f2	public	products/1769800346978-17698003201994240595875870408668.webp	\N	2026-01-30 19:12:29.200918+00	2026-01-30 19:12:29.200918+00	2026-01-30 19:12:29.200918+00	{"eTag": "\\"47c546a1bd819b65fa60c5f277b74de4\\"", "size": 166608, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:12:29.187Z", "contentLength": 166608, "httpStatusCode": 200}	21529416-bddc-42f7-a12d-39b29755f2e4	\N	{}	2
730a5add-6c6c-47b4-854e-60c7f16c1944	public	products/1769800676705-17698006622824339040483222912700.webp	\N	2026-01-30 19:17:58.885588+00	2026-01-30 19:17:58.885588+00	2026-01-30 19:17:58.885588+00	{"eTag": "\\"d9afac3eff322a7691c47427275911a5\\"", "size": 146350, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:17:58.811Z", "contentLength": 146350, "httpStatusCode": 200}	0a93a813-c19b-464b-82ed-86eedfcfaf27	\N	{}	2
8a148b48-c345-48fc-bd2a-e42b1daa2034	public	products/1769801018857-17698010042562788818979769809676.webp	\N	2026-01-30 19:23:41.007909+00	2026-01-30 19:23:41.007909+00	2026-01-30 19:23:41.007909+00	{"eTag": "\\"8aec2bed2f6d2be1f763596d75b916e9\\"", "size": 119256, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:23:40.908Z", "contentLength": 119256, "httpStatusCode": 200}	afc13743-e8c7-46fa-9e69-db15ae4c0b55	\N	{}	2
67ee9fcf-0a31-4676-9cd9-f162fbba76a2	public	sellers/profile/1769707548448-thecnology_logo_3d_no_text_polished_silver.webp	\N	2026-01-29 17:25:49.293315+00	2026-01-29 17:25:49.293315+00	2026-01-29 17:25:49.293315+00	{"eTag": "\\"198ae1d5029ede7d3a9a1c539801eafe\\"", "size": 26492, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-29T17:25:49.287Z", "contentLength": 26492, "httpStatusCode": 200}	e3be9396-4a57-4244-a415-f948ae8ca489	\N	{}	3
bae06b3b-e255-46ab-bdbc-7f9337c58390	public	products/1769785468316-17697854521502640634987894617579.webp	\N	2026-01-30 15:04:29.708716+00	2026-01-30 15:04:29.708716+00	2026-01-30 15:04:29.708716+00	{"eTag": "\\"edc8b063ddeb4c7d6c78643922cd89e6\\"", "size": 110904, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T15:04:29.698Z", "contentLength": 110904, "httpStatusCode": 200}	aa2dc824-bc24-4ff1-bcd2-a326217966b7	\N	{}	2
a47efb4a-e906-4023-80b2-3337301b78a7	public	products/1769785489016-17697854745917079291354153754313.webp	\N	2026-01-30 15:04:51.107502+00	2026-01-30 15:04:51.107502+00	2026-01-30 15:04:51.107502+00	{"eTag": "\\"8fa460f85c5cb94b7f76b22b9b116e70\\"", "size": 129418, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T15:04:51.099Z", "contentLength": 129418, "httpStatusCode": 200}	b9a172ba-52f4-4c4e-bcee-07e37fa31648	\N	{}	2
c8cee951-5c5f-4baa-ba9c-854cdbb98390	public	products/1769797946899-17697979338847526157902893520539.webp	\N	2026-01-30 18:32:28.789357+00	2026-01-30 18:32:28.789357+00	2026-01-30 18:32:28.789357+00	{"eTag": "\\"91ce42f1b98405ac3805bbc0dea2d8ff\\"", "size": 135164, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:32:28.708Z", "contentLength": 135164, "httpStatusCode": 200}	1eee8c82-6039-46db-ae41-d9c4ed8ed3fe	\N	{}	2
beebf85e-49d1-4ef7-ac46-832de79c45d5	public	products/1769870638963-17698706249768714458041852528491.webp	\N	2026-01-31 14:43:59.413792+00	2026-01-31 14:43:59.413792+00	2026-01-31 14:43:59.413792+00	{"eTag": "\\"d4268f143993489b97880eb50875f4d1\\"", "size": 112364, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:43:59.404Z", "contentLength": 112364, "httpStatusCode": 200}	78716128-0f1e-4eb5-8fbf-85367c295b20	\N	{}	2
08f75977-6884-4584-a5c1-917554244984	public	products/1769799023230-17697990109348413514547193403110.webp	\N	2026-01-30 18:50:25.192242+00	2026-01-30 18:50:25.192242+00	2026-01-30 18:50:25.192242+00	{"eTag": "\\"a8fcd2cdf0b743dfdd51b998eee2c6b3\\"", "size": 189042, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:50:25.111Z", "contentLength": 189042, "httpStatusCode": 200}	86506b15-d6c5-40d7-ad20-c4e238b9033d	\N	{}	2
7ade329e-5ef3-428a-bc90-33f4a765cb7d	public	products/1769884054145-17698840374968931526770103095995.webp	\N	2026-01-31 18:27:35.596876+00	2026-01-31 18:27:35.596876+00	2026-01-31 18:27:35.596876+00	{"eTag": "\\"71a616a7e3e4a6988375a28ce41d7b66\\"", "size": 124832, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:27:35.589Z", "contentLength": 124832, "httpStatusCode": 200}	9130e728-bcc2-46c7-8498-e853832d4c4c	\N	{}	2
694a7fa6-a433-4f61-851c-42a485503181	public	products/1769799154344-1769799139680875865767428033593.webp	\N	2026-01-30 18:52:35.686225+00	2026-01-30 18:52:35.686225+00	2026-01-30 18:52:35.686225+00	{"eTag": "\\"29516dcdd0267e21a81d67206e1a6e9b\\"", "size": 193972, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T18:52:35.605Z", "contentLength": 193972, "httpStatusCode": 200}	2448a35f-65a6-4011-b22e-42910c5b2454	\N	{}	2
3fab44c8-10ca-4bee-a215-6670c41678c7	public	products/1769799645433-17697996321952918494264947647974.webp	\N	2026-01-30 19:00:47.014936+00	2026-01-30 19:00:47.014936+00	2026-01-30 19:00:47.014936+00	{"eTag": "\\"f7f7b60b1f6add7f0765a0a877158329\\"", "size": 150970, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:00:47.006Z", "contentLength": 150970, "httpStatusCode": 200}	7cf4cb9c-932e-4514-ac38-48662d9cf7f2	\N	{}	2
efd10bde-dfd4-4da7-bab6-9ace7d11a4a6	public	products/1769800195661-17698001779217905352378220800686.webp	\N	2026-01-30 19:09:57.003108+00	2026-01-30 19:09:57.003108+00	2026-01-30 19:09:57.003108+00	{"eTag": "\\"100c9ec61c2472249c42aa5c8515610f\\"", "size": 103588, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:09:56.999Z", "contentLength": 103588, "httpStatusCode": 200}	00fc7379-c4bb-4575-819d-59e76c28e240	\N	{}	2
de854589-5030-49e6-a23e-e3ea7b23bd48	public	products/1769800430930-17698004071666970557346511283774.webp	\N	2026-01-30 19:13:53.206611+00	2026-01-30 19:13:53.206611+00	2026-01-30 19:13:53.206611+00	{"eTag": "\\"bcf5774acbe0dccadef4842513149967\\"", "size": 173544, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:13:53.105Z", "contentLength": 173544, "httpStatusCode": 200}	23d21022-8af9-4236-ab47-b7524fc9d8e3	\N	{}	2
28f3a1f8-dbe5-455b-b0c2-cd9664a2f5e3	public	products/1769800750238-17698006823728241479660493491904.webp	\N	2026-01-30 19:19:12.107195+00	2026-01-30 19:19:12.107195+00	2026-01-30 19:19:12.107195+00	{"eTag": "\\"dfc7c9997d28aa6bf7085af84b86d96c\\"", "size": 144108, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:19:12.101Z", "contentLength": 144108, "httpStatusCode": 200}	dfd89e7f-caf8-4b33-a593-c6e1702e7c88	\N	{}	2
bf43719e-a97d-4cbf-becf-65d082f12a8b	public	products/1769801035884-17698010242076165690754080429738.webp	\N	2026-01-30 19:23:57.402194+00	2026-01-30 19:23:57.402194+00	2026-01-30 19:23:57.402194+00	{"eTag": "\\"f39324f3782ba1b61e8675cea52c6f27\\"", "size": 126302, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:23:57.386Z", "contentLength": 126302, "httpStatusCode": 200}	f8431333-61ad-4f76-ab1b-9c025e3fafc0	\N	{}	2
7c0ca460-d4e2-45ec-8da0-700f4739ed79	public	products/1769801270190-17698012481488298893517597888953.webp	\N	2026-01-30 19:27:52.088244+00	2026-01-30 19:27:52.088244+00	2026-01-30 19:27:52.088244+00	{"eTag": "\\"d3506eda97a7c3574328d7ff0fe8a225\\"", "size": 72240, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:27:52.002Z", "contentLength": 72240, "httpStatusCode": 200}	048ffe3c-7e3d-448c-a312-ea4e71308395	\N	{}	2
0f622761-237a-43d7-9a41-a8633625a2dd	public	products/1769801334850-17698012760197522442847447795325.webp	\N	2026-01-30 19:28:56.288501+00	2026-01-30 19:28:56.288501+00	2026-01-30 19:28:56.288501+00	{"eTag": "\\"32e6db3406fbfcb6af1f8d3427da816f\\"", "size": 108816, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:28:56.214Z", "contentLength": 108816, "httpStatusCode": 200}	7d93dbba-4d2d-4163-b1c7-488bda9f5210	\N	{}	2
166c88a0-19b6-47c1-aed1-c95c9698eccd	public	products/1769802021097-17698020113495771022212164357749.webp	\N	2026-01-30 19:40:22.702706+00	2026-01-30 19:40:22.702706+00	2026-01-30 19:40:22.702706+00	{"eTag": "\\"9af34a35dbaa85f3000c9bf1523e16eb\\"", "size": 91070, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:40:22.690Z", "contentLength": 91070, "httpStatusCode": 200}	f90a4d3c-7e59-4074-abda-a276b8c702a4	\N	{}	2
1a21cb76-8972-409a-b4f4-c76f47e0a0cd	public	products/1769802042503-17698020288715628508906041223324.webp	\N	2026-01-30 19:40:44.394736+00	2026-01-30 19:40:44.394736+00	2026-01-30 19:40:44.394736+00	{"eTag": "\\"24c7ae794bef2018bfbff9f65c22de95\\"", "size": 112512, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:40:44.317Z", "contentLength": 112512, "httpStatusCode": 200}	a66a3776-9065-427b-b759-541c34beab24	\N	{}	2
7fcb3f7f-0f8a-4731-a355-f7e292fb8ef0	public	products/1769802787584-17698027711235214015311350623255.webp	\N	2026-01-30 19:53:09.690388+00	2026-01-30 19:53:09.690388+00	2026-01-30 19:53:09.690388+00	{"eTag": "\\"5fec89d483ead99e8699a8012bddb878\\"", "size": 115880, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:53:09.617Z", "contentLength": 115880, "httpStatusCode": 200}	046a7efb-6f35-4814-884b-103197f3bc4e	\N	{}	2
11511ae3-223b-4b7d-a1f7-cd304f674531	public	products/1769802832740-17698027931251013088810595814421.webp	\N	2026-01-30 19:53:54.588867+00	2026-01-30 19:53:54.588867+00	2026-01-30 19:53:54.588867+00	{"eTag": "\\"1293300c018cc4ddb8f7803725446ad1\\"", "size": 102470, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T19:53:54.509Z", "contentLength": 102470, "httpStatusCode": 200}	c13197a5-5439-4ffa-8c51-037ae3849838	\N	{}	2
ea1ea475-8693-4721-92cb-0d8cc240bd75	public	products/1769803461021-17698034252715599650412246351533.webp	\N	2026-01-30 20:04:23.012375+00	2026-01-30 20:04:23.012375+00	2026-01-30 20:04:23.012375+00	{"eTag": "\\"812b0868d46002ec7b3138a9f0168a64\\"", "size": 94278, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:04:23.006Z", "contentLength": 94278, "httpStatusCode": 200}	48409317-7a0e-4766-b138-9a0f4b87813d	\N	{}	2
a8177583-9183-4ea1-8782-06dd4eb3fcf3	public	products/1769871480814-17698714469508395029109607842227.webp	\N	2026-01-31 14:58:02.200706+00	2026-01-31 14:58:02.200706+00	2026-01-31 14:58:02.200706+00	{"eTag": "\\"70c8914e15e7266a35d83393c7c57053\\"", "size": 127752, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:58:02.193Z", "contentLength": 127752, "httpStatusCode": 200}	8a0d292a-60fa-4231-9f07-4d5c0c377881	\N	{}	2
f989631f-aac6-4b65-afcb-8d18c16031f3	public	products/1769803477955-1769803466429489560231643729922.webp	\N	2026-01-30 20:04:39.307193+00	2026-01-30 20:04:39.307193+00	2026-01-30 20:04:39.307193+00	{"eTag": "\\"269f93cb68648ac09cc53893c84bc077\\"", "size": 96384, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:04:39.300Z", "contentLength": 96384, "httpStatusCode": 200}	a0c25a80-f45f-40e1-9e54-819bd45e0af9	\N	{}	2
9c768ea0-bc16-4f23-92a9-6fff9e2d6b40	public	products/1769872381182-17698723641281564333925012062907.webp	\N	2026-01-31 15:13:02.590228+00	2026-01-31 15:13:02.590228+00	2026-01-31 15:13:02.590228+00	{"eTag": "\\"074149c0d9b9de41ba5859e810d771aa\\"", "size": 115794, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:13:02.513Z", "contentLength": 115794, "httpStatusCode": 200}	68167367-e887-48b5-9b55-5e6092e4b0b4	\N	{}	2
27612318-1fb5-4dc0-b3a1-5af63c213eb7	public	products/1769804262181-1769804240388618220070553053577.webp	\N	2026-01-30 20:17:44.21195+00	2026-01-30 20:17:44.21195+00	2026-01-30 20:17:44.21195+00	{"eTag": "\\"d960f56ce8fd08ee41a713108a82766c\\"", "size": 103156, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:17:44.204Z", "contentLength": 103156, "httpStatusCode": 200}	c6510899-d48f-4410-bbf0-bf20adabf070	\N	{}	2
5cd0a24e-4db9-4c02-ad22-e7fe2f773ee9	public	products/1769872909978-17698728543672425095381506826255.webp	\N	2026-01-31 15:21:51.184116+00	2026-01-31 15:21:51.184116+00	2026-01-31 15:21:51.184116+00	{"eTag": "\\"2b6e9743675f18777bab3e284818f6b6\\"", "size": 127624, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:21:51.112Z", "contentLength": 127624, "httpStatusCode": 200}	2130372f-3f52-4b93-897d-3fb66ceef1ff	\N	{}	2
f41de929-9abf-45c0-a1fa-9bb9cadb9d91	public	products/1769804285949-17698042669282004724886932172781.webp	\N	2026-01-30 20:18:07.411276+00	2026-01-30 20:18:07.411276+00	2026-01-30 20:18:07.411276+00	{"eTag": "\\"1cfe560f9d5ae153e95719e0bbd24e78\\"", "size": 97848, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:18:07.407Z", "contentLength": 97848, "httpStatusCode": 200}	822034f0-160c-4002-b73a-0ab39b75debd	\N	{}	2
9be46a78-4b5f-4567-bf79-c8708b0deabb	public	products/1769873349403-17698732765198891342430839508436.webp	\N	2026-01-31 15:29:13.294926+00	2026-01-31 15:29:13.294926+00	2026-01-31 15:29:13.294926+00	{"eTag": "\\"fd517ed8c9c4a78c5d4735ec51fba632\\"", "size": 132946, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:29:13.213Z", "contentLength": 132946, "httpStatusCode": 200}	03910f25-bf1d-496d-bfbd-e14d64b64a52	\N	{}	2
d5239664-fd1f-434a-b895-562fe936d3fa	public	products/1769804980579-17698049181573332508280639693423.webp	\N	2026-01-30 20:29:42.401912+00	2026-01-30 20:29:42.401912+00	2026-01-30 20:29:42.401912+00	{"eTag": "\\"fa028e5c163fe94dab992b910341493f\\"", "size": 68498, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:29:42.388Z", "contentLength": 68498, "httpStatusCode": 200}	9fd7e2df-1e75-471e-b5cb-2e6a5af20f55	\N	{}	2
e8d75a10-993a-4743-83ab-21d3880c1835	public	products/1769873472391-17698734265946558504539223220158.webp	\N	2026-01-31 15:31:13.99872+00	2026-01-31 15:31:13.99872+00	2026-01-31 15:31:13.99872+00	{"eTag": "\\"140be61fecad1b3f7e494f3b11d9482c\\"", "size": 138840, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:31:13.991Z", "contentLength": 138840, "httpStatusCode": 200}	a072c54e-d5f7-43e3-b742-27459efca8b5	\N	{}	2
217c7004-ea72-4f83-aa36-079d9dfd6991	public	products/1769805018353-17698049909408247180145114354137.webp	\N	2026-01-30 20:30:20.006215+00	2026-01-30 20:30:20.006215+00	2026-01-30 20:30:20.006215+00	{"eTag": "\\"660a78b756295337f22ec2a7e9407a68\\"", "size": 96634, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:30:20.002Z", "contentLength": 96634, "httpStatusCode": 200}	9663afb4-0ef0-47bc-8a5f-7aee1bd5e13a	\N	{}	2
e3885305-6277-4ea7-968b-2be979646941	public	products/1769806103390-17698060821901365488110843240648.webp	\N	2026-01-30 20:48:25.309106+00	2026-01-30 20:48:25.309106+00	2026-01-30 20:48:25.309106+00	{"eTag": "\\"903793a61d30e50fd257882767dc224d\\"", "size": 122872, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:48:25.293Z", "contentLength": 122872, "httpStatusCode": 200}	611158cb-7887-47a1-a70b-bacf2ff9ccf0	\N	{}	2
31da5a87-3529-4f4a-8a42-46afbee7e4f9	public	products/1769806211597-17698061093069096632160371202005.webp	\N	2026-01-30 20:50:15.001227+00	2026-01-30 20:50:15.001227+00	2026-01-30 20:50:15.001227+00	{"eTag": "\\"887328936444fc43e2283aca00042cf0\\"", "size": 112954, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-30T20:50:14.809Z", "contentLength": 112954, "httpStatusCode": 200}	094d1fe0-f36c-4d42-a537-54ced668edd7	\N	{}	2
b3f45348-a3ac-4aa1-9e6c-10f72eda93f2	public	products/1769864331657-1769864319404848730167469283561.webp	\N	2026-01-31 12:58:53.117667+00	2026-01-31 12:58:53.117667+00	2026-01-31 12:58:53.117667+00	{"eTag": "\\"0525dc70ca3d0c7941ed07a7e1d25827\\"", "size": 112848, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T12:58:53.101Z", "contentLength": 112848, "httpStatusCode": 200}	1f937f4c-6a9a-49a9-8e4e-b133475128a4	\N	{}	2
8e49a995-e97e-4f63-9551-5fdddb6c0f14	public	products/1769864499243-17698644650657463605026457163893.webp	\N	2026-01-31 13:01:40.100261+00	2026-01-31 13:01:40.100261+00	2026-01-31 13:01:40.100261+00	{"eTag": "\\"75c5ae905ec0d66fe3e0d8a79b3a9a35\\"", "size": 92056, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:01:40.085Z", "contentLength": 92056, "httpStatusCode": 200}	24f57ad9-d336-4e50-86e6-30a11eed67f1	\N	{}	2
eb53c757-697f-4dd5-a46b-6a5e0ce2c7ef	public	products/1769884146075-17698841316864799346388962811671.webp	\N	2026-01-31 18:29:07.610056+00	2026-01-31 18:29:07.610056+00	2026-01-31 18:29:07.610056+00	{"eTag": "\\"3b99416516475d72fa0bb68979da4f39\\"", "size": 106694, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:29:07.594Z", "contentLength": 106694, "httpStatusCode": 200}	a632e044-0ea1-4676-8830-98a94625abb0	\N	{}	2
6bc55f9c-607c-44e5-995d-98a73d8c4ac2	public	products/1769864517969-17698645072964734257711706649405.webp	\N	2026-01-31 13:01:58.502919+00	2026-01-31 13:01:58.502919+00	2026-01-31 13:01:58.502919+00	{"eTag": "\\"63777b438449dd2b74a1fa74b1241598\\"", "size": 108466, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:01:58.497Z", "contentLength": 108466, "httpStatusCode": 200}	96649735-ac08-4ecc-b4c6-f4ba3f1b7b24	\N	{}	2
2641e95b-85b5-4312-bf93-ffbeb4b6d79e	public	products/1769871519413-17698714920353571925786905105726.webp	\N	2026-01-31 14:58:42.691426+00	2026-01-31 14:58:42.691426+00	2026-01-31 14:58:42.691426+00	{"eTag": "\\"5563a720ecaf60816dd8cee0465abed3\\"", "size": 123936, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:58:42.686Z", "contentLength": 123936, "httpStatusCode": 200}	18c37309-9a8d-44ba-9ee5-d129ae3d9f6b	\N	{}	2
0eb03e75-fc16-43d9-8297-ede5cee129a8	public	products/1769864887797-17698648548094897265715063981176.webp	\N	2026-01-31 13:08:08.708521+00	2026-01-31 13:08:08.708521+00	2026-01-31 13:08:08.708521+00	{"eTag": "\\"25335c78b786b9623da8fde690f52d48\\"", "size": 83770, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:08:08.701Z", "contentLength": 83770, "httpStatusCode": 200}	ce963909-1a75-4e32-946a-23ff5a153367	\N	{}	2
fc9d6877-f5de-4b99-b4a6-1a689923b8c0	public	products/1769884704569-17698846897583106905799904614257.webp	\N	2026-01-31 18:38:26.098595+00	2026-01-31 18:38:26.098595+00	2026-01-31 18:38:26.098595+00	{"eTag": "\\"38874e8dd02745ed5f2b654ab29a425f\\"", "size": 104782, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:38:26.089Z", "contentLength": 104782, "httpStatusCode": 200}	95c45517-cb2b-44cc-9727-d74070fda5c6	\N	{}	2
8e804e87-a6e3-4c6d-aa1d-edffaf621b7e	public	products/1769864906689-17698648920037158299810037845330.webp	\N	2026-01-31 13:08:27.098637+00	2026-01-31 13:08:27.098637+00	2026-01-31 13:08:27.098637+00	{"eTag": "\\"f20af0e37ea6a03fda2764feab38bc6b\\"", "size": 69712, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:08:27.094Z", "contentLength": 69712, "httpStatusCode": 200}	b8724602-6050-4203-9d40-30f685ae4913	\N	{}	2
5f2bf517-7827-4b75-b3b8-cf1605198365	public	products/1769872424927-17698723945937568474627490500556.webp	\N	2026-01-31 15:13:45.913369+00	2026-01-31 15:13:45.913369+00	2026-01-31 15:13:45.913369+00	{"eTag": "\\"26aa12256d4a408305559da29d3c0a52\\"", "size": 112480, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:13:45.909Z", "contentLength": 112480, "httpStatusCode": 200}	8436d3fb-85fc-4a08-af4b-56f7174785f7	\N	{}	2
2ce8cfd4-d149-4c77-a630-712b79d691c7	public	products/1769865141864-17698651153972915149755367399353.webp	\N	2026-01-31 13:12:22.794581+00	2026-01-31 13:12:22.794581+00	2026-01-31 13:12:22.794581+00	{"eTag": "\\"d7365f3006dca2dabc3dc860a369dfc9\\"", "size": 64108, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:12:22.712Z", "contentLength": 64108, "httpStatusCode": 200}	ccde6ca3-cd2a-4b14-9b4b-cb8f154d6dae	\N	{}	2
6e61d530-246d-410e-9e53-b8ec80953103	public	products/1769865290061-17698652725682570427649897741686.webp	\N	2026-01-31 13:14:51.004188+00	2026-01-31 13:14:51.004188+00	2026-01-31 13:14:51.004188+00	{"eTag": "\\"0d63b3f549ab1eb351e03ec5522749f1\\"", "size": 60572, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:14:50.992Z", "contentLength": 60572, "httpStatusCode": 200}	a71a87f0-2b42-4894-b62e-ad863913ce8b	\N	{}	2
b0d46d27-68fe-4f8d-a644-9ea419185311	public	products/1769873099409-17698730251733020007207776108538.webp	\N	2026-01-31 15:25:00.800599+00	2026-01-31 15:25:00.800599+00	2026-01-31 15:25:00.800599+00	{"eTag": "\\"64dc06b7be283d1b47755c032884d9ad\\"", "size": 142796, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:25:00.791Z", "contentLength": 142796, "httpStatusCode": 200}	2e1c1e36-7c50-4b5e-9c8a-596d0553c87d	\N	{}	2
33e8595c-8137-497b-94fc-249fe18415eb	public	products/1769865307253-176986529435327590770867056940.webp	\N	2026-01-31 13:15:07.707731+00	2026-01-31 13:15:07.707731+00	2026-01-31 13:15:07.707731+00	{"eTag": "\\"1610f305e5ee1c3ef16489b6e2f26464\\"", "size": 91878, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:15:07.699Z", "contentLength": 91878, "httpStatusCode": 200}	84a235ff-f851-41c4-a281-9372aeb79006	\N	{}	2
7176724b-2792-445c-a9e2-b6d20a6b1e1f	public	products/1769866914210-17698669013602527640972188943748.webp	\N	2026-01-31 13:41:55.00392+00	2026-01-31 13:41:55.00392+00	2026-01-31 13:41:55.00392+00	{"eTag": "\\"2cee5890c96b880579ce7e4ebb8808cf\\"", "size": 100182, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:41:54.997Z", "contentLength": 100182, "httpStatusCode": 200}	0b2198f0-aac2-4bae-a935-de4150f7915a	\N	{}	2
b7408593-da89-46ed-9fee-a1e51e0fcb37	public	products/1769866932889-17698669207138655405753376748018.webp	\N	2026-01-31 13:42:13.30461+00	2026-01-31 13:42:13.30461+00	2026-01-31 13:42:13.30461+00	{"eTag": "\\"4b78b973a2da832b8801a0146fb114ab\\"", "size": 80774, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:42:13.300Z", "contentLength": 80774, "httpStatusCode": 200}	f09fba6d-c99e-474e-9899-fda61296b762	\N	{}	2
759d12a1-1ead-4f98-a1a8-180bd7603ca6	public	products/1769867083749-17698670653892744396932369966863.webp	\N	2026-01-31 13:44:44.687427+00	2026-01-31 13:44:44.687427+00	2026-01-31 13:44:44.687427+00	{"eTag": "\\"c094623ed793706db45f7d66ff600d04\\"", "size": 119464, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:44:44.606Z", "contentLength": 119464, "httpStatusCode": 200}	a85678a7-a1df-4ef4-99d8-740eb04f3e25	\N	{}	2
413c4c61-6ecd-4189-9636-4a1725c6b874	public	products/1769867175696-1769867092753306412739855715635.webp	\N	2026-01-31 13:46:16.789367+00	2026-01-31 13:46:16.789367+00	2026-01-31 13:46:16.789367+00	{"eTag": "\\"8ccd1272cfa2d0ca5b153dd039002939\\"", "size": 105500, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T13:46:16.711Z", "contentLength": 105500, "httpStatusCode": 200}	9301aa20-f66c-41d9-bef4-42a341b1e72d	\N	{}	2
144ffc83-381b-4abe-b0e4-e92babf28413	public	products/1769868378042-17698683599508389027393325443871.webp	\N	2026-01-31 14:06:18.987191+00	2026-01-31 14:06:18.987191+00	2026-01-31 14:06:18.987191+00	{"eTag": "\\"f2afdc7600d571bfb6728552ac8a82b1\\"", "size": 140594, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:06:18.911Z", "contentLength": 140594, "httpStatusCode": 200}	05d365d9-59bb-4ac6-9e6f-80af3dee09b4	\N	{}	2
02fc20bb-fa66-44db-8f7e-98e1df0c99e0	public	products/1769871856274-1769871839143853691840105279815.webp	\N	2026-01-31 15:04:17.799245+00	2026-01-31 15:04:17.799245+00	2026-01-31 15:04:17.799245+00	{"eTag": "\\"a497e09985f21452d3215736167d9a42\\"", "size": 139904, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:04:17.791Z", "contentLength": 139904, "httpStatusCode": 200}	b9b46432-7210-44b8-b9f2-c42290878014	\N	{}	2
36d2cf37-2331-4efb-b0a5-01b89a68057a	public	products/1769868416377-17698683955934706049113010123321.webp	\N	2026-01-31 14:06:57.310256+00	2026-01-31 14:06:57.310256+00	2026-01-31 14:06:57.310256+00	{"eTag": "\\"120f38b875d108bd3c7b1f0c9092421e\\"", "size": 110998, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:06:57.295Z", "contentLength": 110998, "httpStatusCode": 200}	5e1a2afa-269e-446e-a82a-4f36728dd053	\N	{}	2
c3f19b60-6d46-4fbc-a558-509494045af1	public	products/1769884169770-17698841494357252594902187688439.webp	\N	2026-01-31 18:29:30.986394+00	2026-01-31 18:29:30.986394+00	2026-01-31 18:29:30.986394+00	{"eTag": "\\"e27bb965be9692a51f911305a1e8d307\\"", "size": 108852, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:29:30.908Z", "contentLength": 108852, "httpStatusCode": 200}	9daea506-33c6-47da-a3c8-e548cf99343d	\N	{}	2
6641a9ee-9e03-45f0-8262-2df2d900dc8f	public	products/1769869189951-17698691309207129387478907198847.webp	\N	2026-01-31 14:19:50.916062+00	2026-01-31 14:19:50.916062+00	2026-01-31 14:19:50.916062+00	{"eTag": "\\"7edf38438772468764ae90446515be20\\"", "size": 94830, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:19:50.906Z", "contentLength": 94830, "httpStatusCode": 200}	90d96aba-4a35-4406-be87-d7f8c3c351d0	\N	{}	2
a5601412-d769-4b5a-9379-9c21f959dac6	public	products/1769872846233-17698728125964936450018659863889.webp	\N	2026-01-31 15:20:50.987375+00	2026-01-31 15:20:50.987375+00	2026-01-31 15:20:50.987375+00	{"eTag": "\\"21120d5da6efffd7dd78c37825c327ce\\"", "size": 125774, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:20:50.911Z", "contentLength": 125774, "httpStatusCode": 200}	b6406d71-6617-44fc-b431-1caf5a620825	\N	{}	2
9147d7f8-c0a7-4b06-b151-a4544efd5abb	public	products/1769869291550-17698692050582654770954932942463.webp	\N	2026-01-31 14:21:32.585292+00	2026-01-31 14:21:32.585292+00	2026-01-31 14:21:32.585292+00	{"eTag": "\\"c9ac5ed6566acfcf12f1860a54f4a3cd\\"", "size": 95712, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:21:32.510Z", "contentLength": 95712, "httpStatusCode": 200}	0b02c060-30ec-4e61-b7ec-e3148b29ba28	\N	{}	2
cbb48fd4-44a4-4018-a5c4-ce05d33e0c43	public	products/1769869523403-17698694956133040074893488456022.webp	\N	2026-01-31 14:25:24.803085+00	2026-01-31 14:25:24.803085+00	2026-01-31 14:25:24.803085+00	{"eTag": "\\"3d3b7863db5fb7b265a45e9c952035b3\\"", "size": 109826, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:25:24.794Z", "contentLength": 109826, "httpStatusCode": 200}	eab96721-b6a6-41b0-b374-41d04dfbc827	\N	{}	2
e08ca02c-0d24-465c-93e1-09791c80bab8	public	products/1769873133223-17698731048293353899411200190550.webp	\N	2026-01-31 15:25:34.689259+00	2026-01-31 15:25:34.689259+00	2026-01-31 15:25:34.689259+00	{"eTag": "\\"4117e447b32a534177636447afea5b42\\"", "size": 126424, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:25:34.612Z", "contentLength": 126424, "httpStatusCode": 200}	923e9261-ad81-4f9b-a9cd-850b5572e183	\N	{}	2
3c42b9bd-324f-4896-ab6a-e40f80fd7425	public	products/1769869559054-17698695401594563092693787141858.webp	\N	2026-01-31 14:25:59.598505+00	2026-01-31 14:25:59.598505+00	2026-01-31 14:25:59.598505+00	{"eTag": "\\"0be47214048255c4185080ba13e4a6ac\\"", "size": 128478, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:25:59.510Z", "contentLength": 128478, "httpStatusCode": 200}	26b78785-6dde-471d-a442-fa29c4758ab3	\N	{}	2
81cc4399-fa0f-44a4-b075-27a2eb0645af	public	products/1769873375230-17698733570702476516918461769152.webp	\N	2026-01-31 15:29:36.308021+00	2026-01-31 15:29:36.308021+00	2026-01-31 15:29:36.308021+00	{"eTag": "\\"32423a424ca95916326b31d6d33f8a73\\"", "size": 152968, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:29:36.294Z", "contentLength": 152968, "httpStatusCode": 200}	cdcfec33-bd83-4908-b3f9-e2177bc108c1	\N	{}	2
741764b4-3877-4bdb-bb03-38f2f72a0d68	public	products/1769869964548-17698699279341814442106809558686.webp	\N	2026-01-31 14:32:45.894386+00	2026-01-31 14:32:45.894386+00	2026-01-31 14:32:45.894386+00	{"eTag": "\\"62d73215e794c939a96e549609f09c51\\"", "size": 139632, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:32:45.886Z", "contentLength": 139632, "httpStatusCode": 200}	7a99f535-72c8-4336-984d-7550485cd295	\N	{}	2
e3c9c37b-34b1-4432-b372-dc64e4bfc341	public	products/1769873503812-17698734786062703728614014822604.webp	\N	2026-01-31 15:31:44.69168+00	2026-01-31 15:31:44.69168+00	2026-01-31 15:31:44.69168+00	{"eTag": "\\"d1b38bc2915733f50d1855e16d89830a\\"", "size": 113180, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:31:44.685Z", "contentLength": 113180, "httpStatusCode": 200}	e7f8786d-88e4-48ac-aff5-5218a7c13815	\N	{}	2
c4f547bb-dd9d-4c64-8e93-5fd47794e7a7	public	products/1769869982923-17698699691812109294656475794738.webp	\N	2026-01-31 14:33:03.387448+00	2026-01-31 14:33:03.387448+00	2026-01-31 14:33:03.387448+00	{"eTag": "\\"6ed17398947cf56ac2b7862dcc242293\\"", "size": 109852, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T14:33:03.306Z", "contentLength": 109852, "httpStatusCode": 200}	9ef4a081-57fa-4729-aa26-3ad2963ef640	\N	{}	2
c49f4495-d05f-4e7d-9db6-2ed00f270bdc	public	products/1769874296846-17698742823669072154645008990860.webp	\N	2026-01-31 15:44:58.391386+00	2026-01-31 15:44:58.391386+00	2026-01-31 15:44:58.391386+00	{"eTag": "\\"d193e8f5a522fbb2baa7e9e69a4acb93\\"", "size": 122360, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:44:58.314Z", "contentLength": 122360, "httpStatusCode": 200}	d398e09c-0609-4225-906e-5359c20659c0	\N	{}	2
7d27af36-a568-4870-989e-8433e30e3089	public	products/1769884316118-17698842897007908218028018744627.webp	\N	2026-01-31 18:31:58.009766+00	2026-01-31 18:31:58.009766+00	2026-01-31 18:31:58.009766+00	{"eTag": "\\"ceed644dfbc741416de9ecaab526b989\\"", "size": 122288, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:31:57.999Z", "contentLength": 122288, "httpStatusCode": 200}	811fb6e6-f123-435c-9258-5c7ed91c074e	\N	{}	2
877f8bb3-c5aa-45ca-adc5-1679a6dab846	public	products/1769874335790-17698743099382690925292410303397.webp	\N	2026-01-31 15:45:36.90511+00	2026-01-31 15:45:36.90511+00	2026-01-31 15:45:36.90511+00	{"eTag": "\\"b187d29f03bd7c0d0c9e7b5300aa9348\\"", "size": 104530, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:45:36.900Z", "contentLength": 104530, "httpStatusCode": 200}	5c0e714e-c488-41e6-a813-af9d2b641821	\N	{}	2
35b66285-85cc-48f7-bd5f-93de88114ed4	public	products/1769874720712-17698747030892502475134113931990.webp	\N	2026-01-31 15:52:02.013819+00	2026-01-31 15:52:02.013819+00	2026-01-31 15:52:02.013819+00	{"eTag": "\\"077dc7675226f314f617c94c05c542ad\\"", "size": 139142, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:52:02.006Z", "contentLength": 139142, "httpStatusCode": 200}	622ee14c-30fe-4c2b-8fa1-c0fe6ee8f030	\N	{}	2
36a011da-e522-42a5-898c-e3c5234a7ca5	public	products/1769884731833-17698847158662694001346882356886.webp	\N	2026-01-31 18:38:52.789221+00	2026-01-31 18:38:52.789221+00	2026-01-31 18:38:52.789221+00	{"eTag": "\\"fc8de0aa856eb3fb2cd8e68b9949e7ac\\"", "size": 105052, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:38:52.716Z", "contentLength": 105052, "httpStatusCode": 200}	477ca88e-6976-4669-b774-68c25ee08f20	\N	{}	2
1a101abd-0a92-4a18-a183-293cc915789b	public	products/1769874745051-1769874725055721284434823655214.webp	\N	2026-01-31 15:52:26.089248+00	2026-01-31 15:52:26.089248+00	2026-01-31 15:52:26.089248+00	{"eTag": "\\"997e51cfaf41133d865ab7403e285879\\"", "size": 117874, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:52:26.016Z", "contentLength": 117874, "httpStatusCode": 200}	8b79c180-058d-48ce-bb6c-8b9fa1fc3a2f	\N	{}	2
cfbad0d3-e516-4298-9396-ed2db0ed05cf	public	products/1770060355644-17700603377415263114265634471853.webp	\N	2026-02-02 19:25:55.31228+00	2026-02-02 19:25:55.31228+00	2026-02-02 19:25:55.31228+00	{"eTag": "\\"bf89f3d5ba06fbe642626acacde819d8\\"", "size": 118278, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:25:55.226Z", "contentLength": 118278, "httpStatusCode": 200}	36ecb08d-0e4d-4745-9bc4-282fb0ff53d6	\N	{}	2
32e4a086-4591-4eb6-9647-56a766dc316e	public	products/1769875180448-17698751610588912836823086185864.webp	\N	2026-01-31 15:59:41.797518+00	2026-01-31 15:59:41.797518+00	2026-01-31 15:59:41.797518+00	{"eTag": "\\"e3deb504e9738b619d70d2ab222f97e3\\"", "size": 119848, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T15:59:41.710Z", "contentLength": 119848, "httpStatusCode": 200}	df1fbc53-5a5a-4d45-98ac-73935ef23652	\N	{}	2
444c490e-ed19-4697-8ef3-24e3cb9dc0ad	public	products/1769875207267-17698751858867010290933029884204.webp	\N	2026-01-31 16:00:08.114317+00	2026-01-31 16:00:08.114317+00	2026-01-31 16:00:08.114317+00	{"eTag": "\\"c44b8369387ebf423a9ef2ccfc6211b3\\"", "size": 105080, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:00:08.107Z", "contentLength": 105080, "httpStatusCode": 200}	9869b94b-8855-49c3-8802-bf8812030ae5	\N	{}	2
182d6659-89b6-4280-83e0-a761794f14e0	public	products/1770061162430-17700611297705909500521336702153.webp	\N	2026-02-02 19:39:22.231073+00	2026-02-02 19:39:22.231073+00	2026-02-02 19:39:22.231073+00	{"eTag": "\\"f59cfa861d9ccf7bee525a336331dd99\\"", "size": 103544, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:39:22.140Z", "contentLength": 103544, "httpStatusCode": 200}	472a4862-0755-44da-9bec-1eed5ab82c16	\N	{}	2
c025c3e2-8934-497b-942a-0bdbf10a9836	public	products/1769875367062-17698753167854272402820590445970.webp	\N	2026-01-31 16:02:48.408849+00	2026-01-31 16:02:48.408849+00	2026-01-31 16:02:48.408849+00	{"eTag": "\\"926a30cee513deb1974cc5f2779759d7\\"", "size": 137930, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:02:48.396Z", "contentLength": 137930, "httpStatusCode": 200}	79ded672-b3bf-4bc2-8cea-c89ab748af8d	\N	{}	2
d3c61994-dd15-4b3c-a362-03d96b84ccd3	public	products/1769875399345-17698753726145463493071533786844.webp	\N	2026-01-31 16:03:20.709062+00	2026-01-31 16:03:20.709062+00	2026-01-31 16:03:20.709062+00	{"eTag": "\\"ea9a5ffbdfd1c7ecd92e11f88bd49bc9\\"", "size": 122512, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:03:20.704Z", "contentLength": 122512, "httpStatusCode": 200}	e964cc8e-3af3-46bc-a78b-566d453c96b6	\N	{}	2
f23feba1-d1a2-4648-b2a1-4fb96ef53ae8	public	products/1769875643525-17698756157137954369164842885846.webp	\N	2026-01-31 16:07:24.992949+00	2026-01-31 16:07:24.992949+00	2026-01-31 16:07:24.992949+00	{"eTag": "\\"23d86e8ad0545ffff5edb0db6fa13ecf\\"", "size": 105902, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:07:24.916Z", "contentLength": 105902, "httpStatusCode": 200}	63c07348-b2bf-4cca-94a7-9d712d8c4766	\N	{}	2
eef66ae3-7d6c-4d61-a4cd-5b88bf47bb99	public	products/1769875765874-17698757335665140656492705476826.webp	\N	2026-01-31 16:09:27.190017+00	2026-01-31 16:09:27.190017+00	2026-01-31 16:09:27.190017+00	{"eTag": "\\"46ddb742b78ec0c0cbc01ea78a0999d3\\"", "size": 107236, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:09:27.113Z", "contentLength": 107236, "httpStatusCode": 200}	4c844870-55e0-40f7-8beb-f1f3c0fddb1c	\N	{}	2
473fc1de-dbac-4fd7-b8c2-c31506cfc346	public	products/1769875970158-17698759154152580725854353061315.webp	\N	2026-01-31 16:12:51.598916+00	2026-01-31 16:12:51.598916+00	2026-01-31 16:12:51.598916+00	{"eTag": "\\"42c04bbfbff8eba0662c62de0bcd156e\\"", "size": 133424, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:12:51.586Z", "contentLength": 133424, "httpStatusCode": 200}	45729c89-4923-497e-9d4d-375dd66ac9a4	\N	{}	2
f444f519-235b-4394-8854-aa3892632313	public	products/1769876033539-1769875974411601798158495341763.webp	\N	2026-01-31 16:13:55.495479+00	2026-01-31 16:13:55.495479+00	2026-01-31 16:13:55.495479+00	{"eTag": "\\"d860ada9f0ee2b9a5b4c45718e831bc2\\"", "size": 168112, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:13:55.488Z", "contentLength": 168112, "httpStatusCode": 200}	3b5a5cfc-22dc-4ef4-be42-cfa2df3863ab	\N	{}	2
4430f012-6000-4076-8605-fc810ee547df	public	products/1769884344935-17698843205071533223995589573320.webp	\N	2026-01-31 18:32:26.697255+00	2026-01-31 18:32:26.697255+00	2026-01-31 18:32:26.697255+00	{"eTag": "\\"20bfef9ba7942e7fe6e2c8af019c761d\\"", "size": 115206, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:32:26.689Z", "contentLength": 115206, "httpStatusCode": 200}	8680f24a-b5ef-46df-b376-911c89e96e96	\N	{}	2
21e7c29d-0c52-4ffd-aaa1-835962591fb9	public	products/1769876180916-17698761627663126519001831368071.webp	\N	2026-01-31 16:16:22.293797+00	2026-01-31 16:16:22.293797+00	2026-01-31 16:16:22.293797+00	{"eTag": "\\"3a2453d9a9027ce79610ee03c1f32b2e\\"", "size": 135208, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:16:22.285Z", "contentLength": 135208, "httpStatusCode": 200}	798de5d1-77bd-45e7-ab0d-203ef0be5d0e	\N	{}	2
9969ef3b-e0c0-4a71-a37e-76d31697e689	public	products/1769876212591-1769876190757578295535040670403.webp	\N	2026-01-31 16:16:54.286909+00	2026-01-31 16:16:54.286909+00	2026-01-31 16:16:54.286909+00	{"eTag": "\\"af12592371558b7446f3b313ed8899cf\\"", "size": 104790, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:16:54.211Z", "contentLength": 104790, "httpStatusCode": 200}	a25651c9-66d6-4276-bb13-1af461ab83bd	\N	{}	2
b2e012bb-e0ea-418d-97e6-b703fc76f6f9	public	products/1769884846141-17698848224332182378009154854586.webp	\N	2026-01-31 18:40:47.785367+00	2026-01-31 18:40:47.785367+00	2026-01-31 18:40:47.785367+00	{"eTag": "\\"6fc33fa052cbe74b1aa86a6cff98ba8c\\"", "size": 115450, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:40:47.711Z", "contentLength": 115450, "httpStatusCode": 200}	13d7a951-8717-4875-9e0a-dba3b8a44a9a	\N	{}	2
b77f18d4-d6df-4390-a48f-e88f6e672486	public	products/1769876594482-1769876573705375776728464412797.webp	\N	2026-01-31 16:23:15.990818+00	2026-01-31 16:23:15.990818+00	2026-01-31 16:23:15.990818+00	{"eTag": "\\"30432e64e1dc495d1494b43f4b1dd3cb\\"", "size": 128010, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:23:15.912Z", "contentLength": 128010, "httpStatusCode": 200}	63d44968-c2a3-430d-a18c-a302dafd271f	\N	{}	2
2a6111a9-fd5e-4145-86ad-fa697f7fd398	public	products/1769876641066-17698766036973181770586268847853.webp	\N	2026-01-31 16:24:03.19067+00	2026-01-31 16:24:03.19067+00	2026-01-31 16:24:03.19067+00	{"eTag": "\\"70b5c7147bba86090036f596e1876dc7\\"", "size": 115888, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:24:03.009Z", "contentLength": 115888, "httpStatusCode": 200}	e8975852-f2d6-4925-acfd-38f361697827	\N	{}	2
9a5f73bf-34b1-465e-abc9-4e36c1c16aa1	public	products/1770059413814-17700593867215852412216906543360.webp	\N	2026-02-02 19:10:14.09096+00	2026-02-02 19:10:14.09096+00	2026-02-02 19:10:14.09096+00	{"eTag": "\\"785901a58526fd6f6fa62e956043dd23\\"", "size": 112340, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:10:14.003Z", "contentLength": 112340, "httpStatusCode": 200}	fc2f712b-88d4-47f0-9277-62d310e6a162	\N	{}	2
3eec3a90-0967-4770-9b19-dd6d77792969	public	products/1769876903112-17698768013786657584168949122620.webp	\N	2026-01-31 16:28:25.801807+00	2026-01-31 16:28:25.801807+00	2026-01-31 16:28:25.801807+00	{"eTag": "\\"53832907899647900ac967ac6496d236\\"", "size": 139312, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:28:25.787Z", "contentLength": 139312, "httpStatusCode": 200}	f42f52bb-1a44-4918-880b-0e3a74b4502c	\N	{}	2
f6f8ee0e-829b-43f6-ae52-3602ecda65fb	public	products/1769876944925-17698769104384937399367110136595.webp	\N	2026-01-31 16:29:06.404119+00	2026-01-31 16:29:06.404119+00	2026-01-31 16:29:06.404119+00	{"eTag": "\\"ab1d817648184bcf3973275da295162a\\"", "size": 121708, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:29:06.397Z", "contentLength": 121708, "httpStatusCode": 200}	9a6437fe-c3c1-4fe5-a10c-eb0d9781977e	\N	{}	2
5ec3e9d6-8657-4a26-a907-420b68568ec8	public	products/1769877973402-17698778260025935242592263985864.webp	\N	2026-01-31 16:46:14.515466+00	2026-01-31 16:46:14.515466+00	2026-01-31 16:46:14.515466+00	{"eTag": "\\"dc1b4cf8645b2a3ae818b887c60b1dcd\\"", "size": 39198, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:46:14.502Z", "contentLength": 39198, "httpStatusCode": 200}	06030d87-2ee6-4229-af7f-cc9d1eb20604	\N	{}	2
2d9230cd-b520-43bd-bf68-76d43f4cf1c3	public	products/1769878028869-17698779787263911530194924017187.webp	\N	2026-01-31 16:47:10.020895+00	2026-01-31 16:47:10.020895+00	2026-01-31 16:47:10.020895+00	{"eTag": "\\"c3af8d4d71a205fb77e30dd23d7634d8\\"", "size": 54496, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:47:10.016Z", "contentLength": 54496, "httpStatusCode": 200}	65e3610c-205d-4664-a42c-f43fd053e8c8	\N	{}	2
3a453c41-bed4-413c-afcd-c23e3149fb1e	public	products/1769878453589-17698783611246368300124052655016.webp	\N	2026-01-31 16:54:14.6073+00	2026-01-31 16:54:14.6073+00	2026-01-31 16:54:14.6073+00	{"eTag": "\\"1460aa327832777be2480ea3eef8fa9f\\"", "size": 71276, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:54:14.600Z", "contentLength": 71276, "httpStatusCode": 200}	3c6631a9-6242-4a4a-83b0-fec661b090fd	\N	{}	2
40510659-0be5-414f-aa38-b2cbfabacb0c	public	products/1769878525694-17698784661202613616727774726451.webp	\N	2026-01-31 16:55:26.720682+00	2026-01-31 16:55:26.720682+00	2026-01-31 16:55:26.720682+00	{"eTag": "\\"271de7932cd5967910a4951d67fec835\\"", "size": 114520, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T16:55:26.716Z", "contentLength": 114520, "httpStatusCode": 200}	dd21cab4-2f41-4140-a1cb-1ba77509f970	\N	{}	2
3f271280-666f-4551-8d15-431ffcb1e3e0	public	products/1769884430237-17698844064601382281864261333529.webp	\N	2026-01-31 18:33:51.802991+00	2026-01-31 18:33:51.802991+00	2026-01-31 18:33:51.802991+00	{"eTag": "\\"89041520ed5b655c17847392e149ad25\\"", "size": 103032, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:33:51.715Z", "contentLength": 103032, "httpStatusCode": 200}	02e331d6-31cd-449d-af7e-20663a812ce6	\N	{}	2
1f898a6c-1a1b-4669-95c9-f9603d9eacd4	public	products/1769880751246-17698807281252772175648217160746.webp	\N	2026-01-31 17:32:33.092359+00	2026-01-31 17:32:33.092359+00	2026-01-31 17:32:33.092359+00	{"eTag": "\\"3db0b638fcc1a970a5fc867c4383ef72\\"", "size": 55500, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:32:33.008Z", "contentLength": 55500, "httpStatusCode": 200}	7a433cd4-21eb-4283-bedd-b0e5aec4e32a	\N	{}	2
2adcf50a-1043-4d8f-b9b1-4a69bb854151	public	products/1769880769734-17698807547301941268308197097242.webp	\N	2026-01-31 17:32:51.199585+00	2026-01-31 17:32:51.199585+00	2026-01-31 17:32:51.199585+00	{"eTag": "\\"e5b871e5bc4f99cae9aeefa6d8102cde\\"", "size": 132534, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:32:51.112Z", "contentLength": 132534, "httpStatusCode": 200}	3325ea76-d95d-4597-a08a-870938aa8e81	\N	{}	2
5e9999ee-2515-4d87-aadb-996e58a8c40b	public	products/1769884889250-17698848486884026812107434301273.webp	\N	2026-01-31 18:41:30.687947+00	2026-01-31 18:41:30.687947+00	2026-01-31 18:41:30.687947+00	{"eTag": "\\"38b07bd8a063c76bd383b34d50792ddc\\"", "size": 111062, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:41:30.609Z", "contentLength": 111062, "httpStatusCode": 200}	2ccb6c30-ae97-43e1-9450-cea779fad99e	\N	{}	2
05a310ec-bc6c-457c-b8fb-7c7dd048d2a5	public	products/1770059475972-17700594518733497662380322332589.webp	\N	2026-02-02 19:11:15.406833+00	2026-02-02 19:11:15.406833+00	2026-02-02 19:11:15.406833+00	{"eTag": "\\"b4be61f59286a3618a87ea04e8a3b5c2\\"", "size": 122768, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:11:15.313Z", "contentLength": 122768, "httpStatusCode": 200}	743842f5-80c6-442e-818c-1b7c727bf900	\N	{}	2
d1cf4292-3e46-42b2-a337-8d46858ac6bf	public	products/1770060387899-17700603600494053577273343847916.webp	\N	2026-02-02 19:26:27.336772+00	2026-02-02 19:26:27.336772+00	2026-02-02 19:26:27.336772+00	{"eTag": "\\"07a481357fd94d869ec448584fd783b6\\"", "size": 101768, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:26:27.331Z", "contentLength": 101768, "httpStatusCode": 200}	f628a8ec-870e-421e-ad1e-1f0943411d46	\N	{}	2
b01a6f80-3372-4226-ae9e-08c22e29e6e0	public	products/1770061192318-17700611758384413317836703083779.webp	\N	2026-02-02 19:39:51.528202+00	2026-02-02 19:39:51.528202+00	2026-02-02 19:39:51.528202+00	{"eTag": "\\"d83ccd46cb1d9e7a1a75eb67ef1cd943\\"", "size": 108166, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:39:51.520Z", "contentLength": 108166, "httpStatusCode": 200}	704036e5-7532-4996-820c-c75750e046c0	\N	{}	2
a064a3e6-db01-4aee-a5b7-47a4c8848ff7	public	products/1769881126440-17698811038505713973836792842793.webp	\N	2026-01-31 17:38:50.994492+00	2026-01-31 17:38:50.994492+00	2026-01-31 17:38:50.994492+00	{"eTag": "\\"887a4ce3a8d4562f4e30f0322168a351\\"", "size": 143144, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:38:50.915Z", "contentLength": 143144, "httpStatusCode": 200}	85fbc7a0-c7db-493d-8821-fa40ce54c3f2	\N	{}	2
d7f27456-536e-4c9b-8f5d-6e6200a8a1c7	public	products/1769881165938-17698811335575356206258346365075.webp	\N	2026-01-31 17:39:28.186635+00	2026-01-31 17:39:28.186635+00	2026-01-31 17:39:28.186635+00	{"eTag": "\\"f3b986932e30b1c1a21ac8fe96d6ccbe\\"", "size": 129976, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:39:28.108Z", "contentLength": 129976, "httpStatusCode": 200}	55d66fb4-2c85-4bf7-894c-e6b39046b89f	\N	{}	2
3bbf07c5-d0a2-4e97-b6bb-c097b1a1b30d	public	products/1769881383135-17698813602797010743985117898578.webp	\N	2026-01-31 17:43:04.817787+00	2026-01-31 17:43:04.817787+00	2026-01-31 17:43:04.817787+00	{"eTag": "\\"b559bf1f3ffb058a057139b0b2f7ceee\\"", "size": 103318, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:43:04.807Z", "contentLength": 103318, "httpStatusCode": 200}	d261026f-ea5c-413b-9caa-2b0cdcd2bf55	\N	{}	2
e6e89247-4996-446a-ac14-1aa85266710f	public	products/1769881434506-17698813896366717877431340179381.webp	\N	2026-01-31 17:43:55.894658+00	2026-01-31 17:43:55.894658+00	2026-01-31 17:43:55.894658+00	{"eTag": "\\"11118195315018199006b74aa6504641\\"", "size": 99142, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:43:55.890Z", "contentLength": 99142, "httpStatusCode": 200}	f4bfec12-495c-490d-9374-df0eae6fb036	\N	{}	2
9b883153-9f3f-4182-b60f-a9c07ae174c3	public	products/1769881560838-1769881535774955712428164218543.webp	\N	2026-01-31 17:46:02.118522+00	2026-01-31 17:46:02.118522+00	2026-01-31 17:46:02.118522+00	{"eTag": "\\"1cff67247523b663c6a717ea2590ae80\\"", "size": 159296, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:46:02.105Z", "contentLength": 159296, "httpStatusCode": 200}	3e2dae21-38ce-48cc-879d-dfb01c47f7cf	\N	{}	2
5c9d983a-5763-4e73-bec2-f69d5a507294	public	products/1769881596652-17698815645088235819221456119074.webp	\N	2026-01-31 17:46:39.196211+00	2026-01-31 17:46:39.196211+00	2026-01-31 17:46:39.196211+00	{"eTag": "\\"bd96971c91ad9fe4930a74071bc46580\\"", "size": 110974, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:46:39.186Z", "contentLength": 110974, "httpStatusCode": 200}	4ca48633-8c7a-4d28-9f26-64ab4640175d	\N	{}	2
bd272814-1b6a-48dc-aa97-22df05b1bbc7	public	products/1769884453530-17698844357296381824518865871472.webp	\N	2026-01-31 18:34:14.794847+00	2026-01-31 18:34:14.794847+00	2026-01-31 18:34:14.794847+00	{"eTag": "\\"499d1f11e4db46cea50c26be17628be4\\"", "size": 108210, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:34:14.715Z", "contentLength": 108210, "httpStatusCode": 200}	e5a2c8b6-9b28-48fb-b9d5-0991f5fc00b5	\N	{}	2
ee71b201-b0cf-4a22-ac5f-5c97e6299f98	public	products/1769881692182-17698816617165726391027977390377.webp	\N	2026-01-31 17:48:14.006152+00	2026-01-31 17:48:14.006152+00	2026-01-31 17:48:14.006152+00	{"eTag": "\\"5d7e60a237c4e90327e9bcdeb2f92496\\"", "size": 97736, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:48:13.907Z", "contentLength": 97736, "httpStatusCode": 200}	fe0a62ae-3dfe-43ab-82f8-efae60259050	\N	{}	2
7049b005-3df0-483d-9ae4-ba46bc36c38d	public	products/1769881718328-17698816958457854440073920768241.webp	\N	2026-01-31 17:48:39.488425+00	2026-01-31 17:48:39.488425+00	2026-01-31 17:48:39.488425+00	{"eTag": "\\"e9b1545bd04d1cb6f9a718ec809cb4f0\\"", "size": 94640, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:48:39.412Z", "contentLength": 94640, "httpStatusCode": 200}	80c21989-beb9-4120-86a6-e8dd15fad365	\N	{}	2
78651594-bece-4321-8876-a6e8eeee38ab	public	products/1769884999642-17698849790127414265842076523479.webp	\N	2026-01-31 18:43:21.509911+00	2026-01-31 18:43:21.509911+00	2026-01-31 18:43:21.509911+00	{"eTag": "\\"67779af9f0284e6584539789ec0eb085\\"", "size": 134234, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:43:21.501Z", "contentLength": 134234, "httpStatusCode": 200}	c778c52e-3b00-439c-a62f-438297697070	\N	{}	2
36edaeb8-cac6-4364-ad96-adae4db3e617	public	products/1769881943890-17698819034713151978932736684248.webp	\N	2026-01-31 17:52:25.607574+00	2026-01-31 17:52:25.607574+00	2026-01-31 17:52:25.607574+00	{"eTag": "\\"f701f7759959ad2571944e2d3faf65b1\\"", "size": 116918, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:52:25.596Z", "contentLength": 116918, "httpStatusCode": 200}	914e99e9-3227-4bbc-a311-242b4a1cce6d	\N	{}	2
57eaf49f-0784-4ed7-9126-ed86c90a1e18	public	products/1769881990986-17698819476864583369565704351526.webp	\N	2026-01-31 17:53:12.506207+00	2026-01-31 17:53:12.506207+00	2026-01-31 17:53:12.506207+00	{"eTag": "\\"ec0b33dec528a7f91a6ef73ab0a3d35f\\"", "size": 126826, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:53:12.491Z", "contentLength": 126826, "httpStatusCode": 200}	7bf3576c-349f-4677-9fae-c8ed740a6fd4	\N	{}	2
0a25b9ee-9bdc-49e0-b40e-56a555c3e72b	public	products/1770059873686-17700598297711916202754720628140.webp	\N	2026-02-02 19:17:53.414917+00	2026-02-02 19:17:53.414917+00	2026-02-02 19:17:53.414917+00	{"eTag": "\\"91e9690f4ea3204bcffa232350f44aa0\\"", "size": 82712, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:17:53.398Z", "contentLength": 82712, "httpStatusCode": 200}	8dc5a3a6-92fa-4a13-a613-a05d07b16203	\N	{}	2
24199585-ace3-4e8b-912c-7840691797fa	public	products/1769882210403-17698821465841624215694158006956.webp	\N	2026-01-31 17:56:51.810441+00	2026-01-31 17:56:51.810441+00	2026-01-31 17:56:51.810441+00	{"eTag": "\\"03c7e53798b6f40b7538a4a4a4e4c4b5\\"", "size": 82224, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:56:51.802Z", "contentLength": 82224, "httpStatusCode": 200}	d0c6d424-2304-49d1-a826-dd073a85bc5b	\N	{}	2
caf1ba31-2716-4410-8238-d3c776e79fa1	public	products/1769882250418-17698822147715547669021517422029.webp	\N	2026-01-31 17:57:31.900209+00	2026-01-31 17:57:31.900209+00	2026-01-31 17:57:31.900209+00	{"eTag": "\\"74e575ba76379f7318319409c8c09135\\"", "size": 72030, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T17:57:31.891Z", "contentLength": 72030, "httpStatusCode": 200}	051a7b51-3290-4795-a651-e2c8b2fc3497	\N	{}	2
90de9c07-e288-40ec-9d09-2900f31cf31f	public	products/1769882417021-17698823972721259238050307551443.webp	\N	2026-01-31 18:00:18.404767+00	2026-01-31 18:00:18.404767+00	2026-01-31 18:00:18.404767+00	{"eTag": "\\"353b2878be53f8afbcf7b3c4cd4eab14\\"", "size": 106632, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:00:18.396Z", "contentLength": 106632, "httpStatusCode": 200}	17b244ab-2803-4125-ad66-51aa7a72faf3	\N	{}	2
b2d4718f-a1bb-48f1-96fd-7f422ababf38	public	products/1769882452158-1769882422561419369807476810178.webp	\N	2026-01-31 18:00:53.498104+00	2026-01-31 18:00:53.498104+00	2026-01-31 18:00:53.498104+00	{"eTag": "\\"ac43473063f1bd7c68f2e64a76f11a43\\"", "size": 88604, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:00:53.489Z", "contentLength": 88604, "httpStatusCode": 200}	c390511c-3a54-415a-b93b-e77cb92f0020	\N	{}	2
ea138748-e21d-4978-a257-b4fb23f0edb6	public	products/1769882825470-17698828066488740495821329985671.webp	\N	2026-01-31 18:07:07.987428+00	2026-01-31 18:07:07.987428+00	2026-01-31 18:07:07.987428+00	{"eTag": "\\"1a828b34db5a02c50647f9feea2029cb\\"", "size": 110606, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:07:07.595Z", "contentLength": 110606, "httpStatusCode": 200}	8e159d53-9680-4613-b605-dfff8089e31a	\N	{}	2
6620de86-ceb6-4c3f-a31d-268d8dc8eddd	public	products/1769882845269-17698828317854679785415527921439.webp	\N	2026-01-31 18:07:26.613468+00	2026-01-31 18:07:26.613468+00	2026-01-31 18:07:26.613468+00	{"eTag": "\\"b81a968a15143853f8487625f3a4c972\\"", "size": 104766, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:07:26.607Z", "contentLength": 104766, "httpStatusCode": 200}	66313bac-54b7-48a7-b317-93b602de8d61	\N	{}	2
a1e351ee-9e05-429d-8630-b5e0fc049505	public	products/1769884575650-17698845584899085937375959073244.webp	\N	2026-01-31 18:36:17.20428+00	2026-01-31 18:36:17.20428+00	2026-01-31 18:36:17.20428+00	{"eTag": "\\"46715d5413bfbb53c128df42f6214ce3\\"", "size": 104020, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:36:17.190Z", "contentLength": 104020, "httpStatusCode": 200}	f98199b4-2d04-479c-903f-acd37e343fe5	\N	{}	2
37c497eb-8070-4e2d-bba5-232e79e2d0a2	public	products/1769883016063-17698829795025786209850258001379.webp	\N	2026-01-31 18:10:17.408461+00	2026-01-31 18:10:17.408461+00	2026-01-31 18:10:17.408461+00	{"eTag": "\\"24d4999ec1fc5b080e12bf45203ae3ad\\"", "size": 101236, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:10:17.397Z", "contentLength": 101236, "httpStatusCode": 200}	39669c11-7352-49ba-9d27-51e0b7467c62	\N	{}	2
a1ae87f7-86ac-4c36-8263-f1ecf23a0043	public	products/1769883058121-17698830187082956880477096128062.webp	\N	2026-01-31 18:10:59.103441+00	2026-01-31 18:10:59.103441+00	2026-01-31 18:10:59.103441+00	{"eTag": "\\"d2def633d6e4e2377c3dccf585a47439\\"", "size": 109082, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:10:59.096Z", "contentLength": 109082, "httpStatusCode": 200}	6c4ac2e1-acb9-42f4-90fe-7fe12bb628e1	\N	{}	2
578cb6a2-5d45-4d3f-bf52-c40baa8f0812	public	products/1769885024534-17698850027386202379464015231725.webp	\N	2026-01-31 18:43:45.688137+00	2026-01-31 18:43:45.688137+00	2026-01-31 18:43:45.688137+00	{"eTag": "\\"e00100350584347e009bf8991d047ff0\\"", "size": 123922, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:43:45.612Z", "contentLength": 123922, "httpStatusCode": 200}	ab1fa759-3e3c-4ff5-a08a-381b2eb7d00d	\N	{}	2
6e1c25e1-d937-4a73-b0dc-092aef4df5de	public	products/1769883113484-1769883100597890481060195036317.webp	\N	2026-01-31 18:11:54.602256+00	2026-01-31 18:11:54.602256+00	2026-01-31 18:11:54.602256+00	{"eTag": "\\"795ca50d10909c79945202630beb55aa\\"", "size": 101158, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:11:54.596Z", "contentLength": 101158, "httpStatusCode": 200}	c10e80cf-d9f0-4c29-8f85-1f6ad90e1382	\N	{}	2
1b55501d-656f-4b38-a062-4fcf20543989	public	products/1769883142686-17698831156324110952564446403712.webp	\N	2026-01-31 18:12:23.707945+00	2026-01-31 18:12:23.707945+00	2026-01-31 18:12:23.707945+00	{"eTag": "\\"77163f14f11fb875d75379cee9f45eba\\"", "size": 114970, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:12:23.703Z", "contentLength": 114970, "httpStatusCode": 200}	871626d8-77e0-4fdb-9d46-a2e4ee9e9dca	\N	{}	2
5164f702-d345-43a6-b8e4-fb3deeefbf9d	public	products/1770059917719-17700598867022882341228694919751.webp	\N	2026-02-02 19:18:36.908113+00	2026-02-02 19:18:36.908113+00	2026-02-02 19:18:36.908113+00	{"eTag": "\\"b7e64af4b3ee95fc29e4add726f349d6\\"", "size": 59116, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:18:36.819Z", "contentLength": 59116, "httpStatusCode": 200}	3821761c-676a-4b5d-a737-47af061a7eb4	\N	{}	2
2d07c937-04ff-4638-940a-a10b4a9154bb	public	products/1769883244932-17698832265006574757775254816811.webp	\N	2026-01-31 18:14:06.413624+00	2026-01-31 18:14:06.413624+00	2026-01-31 18:14:06.413624+00	{"eTag": "\\"c6bc12c3a8e58bf573aa2cfd462687bc\\"", "size": 106826, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:14:06.402Z", "contentLength": 106826, "httpStatusCode": 200}	fea236d1-c0d9-449c-8c77-5aff397097e5	\N	{}	2
37922849-1672-40b7-9b04-ac7253e91353	public	products/1770060684159-17700606342965837970655849501584.webp	\N	2026-02-02 19:31:23.626387+00	2026-02-02 19:31:23.626387+00	2026-02-02 19:31:23.626387+00	{"eTag": "\\"d7812dcf7767a4c10040079403be0a88\\"", "size": 93752, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:31:23.613Z", "contentLength": 93752, "httpStatusCode": 200}	7fb065c6-7f84-431e-b41e-32b982d4a98c	\N	{}	2
5ec0e645-77ab-4942-a73e-d4674da632f6	public	products/1769883276391-17698832481538627655074390960542.webp	\N	2026-01-31 18:14:37.501641+00	2026-01-31 18:14:37.501641+00	2026-01-31 18:14:37.501641+00	{"eTag": "\\"5ed0b3cb10dbdc4753cf4c2bbc4b4280\\"", "size": 114318, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:14:37.497Z", "contentLength": 114318, "httpStatusCode": 200}	2e4f082c-4924-48cc-86fa-3faafaa21292	\N	{}	2
5aca8487-99dd-4ddb-9717-1f25716a57a4	public	products/1769883383915-17698833728262447741448126857675.webp	\N	2026-01-31 18:16:25.203385+00	2026-01-31 18:16:25.203385+00	2026-01-31 18:16:25.203385+00	{"eTag": "\\"68ce943b97b045f20c6e34573194812e\\"", "size": 109590, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:16:25.191Z", "contentLength": 109590, "httpStatusCode": 200}	eb113193-26dd-4f88-9058-3a21ed8675f6	\N	{}	2
2e79b99e-3c8a-47e7-aa4b-87e799e7a176	public	products/1769883396870-17698833870007165091670525495853.webp	\N	2026-01-31 18:16:38.108269+00	2026-01-31 18:16:38.108269+00	2026-01-31 18:16:38.108269+00	{"eTag": "\\"4ad62d8c4bf3b1b62f978466bc9cbdd2\\"", "size": 102936, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:16:38.102Z", "contentLength": 102936, "httpStatusCode": 200}	fdc065e5-5054-42c9-8871-b003cfb0f7d6	\N	{}	2
781c1e53-985a-40e0-92d9-db5f6994d257	public	products/1769883549765-17698835181423389589411221033216.webp	\N	2026-01-31 18:19:11.489528+00	2026-01-31 18:19:11.489528+00	2026-01-31 18:19:11.489528+00	{"eTag": "\\"e14f0c2f54fb8651d797ec214f047060\\"", "size": 126894, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:19:11.409Z", "contentLength": 126894, "httpStatusCode": 200}	a88074ce-e545-4f16-a477-3e38c967ff8f	\N	{}	2
dce00052-227f-4728-a5e5-6ee7a7bf31ef	public	products/1769883597256-17698835527994302498331091991820.webp	\N	2026-01-31 18:19:58.68839+00	2026-01-31 18:19:58.68839+00	2026-01-31 18:19:58.68839+00	{"eTag": "\\"56f426fd8aea091e8fa98a24025f80a7\\"", "size": 133588, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:19:58.611Z", "contentLength": 133588, "httpStatusCode": 200}	2c115ce3-0966-4b17-9841-e84020a26175	\N	{}	2
980f5a44-6a01-409f-966a-8567d9815c43	public	products/1769884594787-17698845800367126026529333320989.webp	\N	2026-01-31 18:36:35.679058+00	2026-01-31 18:36:35.679058+00	2026-01-31 18:36:35.679058+00	{"eTag": "\\"5419f95df8578b09157a46aa16055ed2\\"", "size": 128680, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:36:35.667Z", "contentLength": 128680, "httpStatusCode": 200}	00144419-55ba-4598-9a27-9f2b534b5947	\N	{}	2
14570529-36da-4fb1-997e-3d5e3cd1372b	public	products/1769883754663-17698837224412778646518058334620.webp	\N	2026-01-31 18:22:36.101373+00	2026-01-31 18:22:36.101373+00	2026-01-31 18:22:36.101373+00	{"eTag": "\\"e2dcd843593aa7cc964d81a12df5f50f\\"", "size": 127782, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:22:36.094Z", "contentLength": 127782, "httpStatusCode": 200}	71b77d01-7636-4f94-b0d5-66ad9f9ab015	\N	{}	2
7d4f6c21-7fe3-4584-99bf-c83f80999fec	public	products/1769883864484-17698837577773123483089168925876.webp	\N	2026-01-31 18:24:26.094462+00	2026-01-31 18:24:26.094462+00	2026-01-31 18:24:26.094462+00	{"eTag": "\\"b7ba0667a75b37c6e1c824b157ddb5d1\\"", "size": 105518, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-01-31T18:24:26.013Z", "contentLength": 105518, "httpStatusCode": 200}	b23088ec-4c5b-4976-ade7-4619bf50a464	\N	{}	2
0e3a4015-18ac-4e6c-af0e-80524c9ff4ef	public	products/1770060706831-17700606891045711996277867687603.webp	\N	2026-02-02 19:31:45.808503+00	2026-02-02 19:31:45.808503+00	2026-02-02 19:31:45.808503+00	{"eTag": "\\"e0d8852906fbb8b097c73e2966b84af5\\"", "size": 62172, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:31:45.735Z", "contentLength": 62172, "httpStatusCode": 200}	f431604d-852d-4b5f-8212-bbcb9c96ea5d	\N	{}	2
9faee1bb-031f-4a4e-a2f5-fe11356f4459	public	products/1770061708035-1770061686725712508581639292472.webp	\N	2026-02-02 19:48:27.330822+00	2026-02-02 19:48:27.330822+00	2026-02-02 19:48:27.330822+00	{"eTag": "\\"1b6b9b3166171af573ac1cf97e63cc61\\"", "size": 83564, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:48:27.316Z", "contentLength": 83564, "httpStatusCode": 200}	34036ea5-8717-42fb-8066-de1661fb05d4	\N	{}	2
191d1481-6081-4dbf-b28f-a3cb26e4e584	public	products/1770061855649-17700618095013123135068953514365.webp	\N	2026-02-02 19:50:55.214464+00	2026-02-02 19:50:55.214464+00	2026-02-02 19:50:55.214464+00	{"eTag": "\\"68c42c35e0bde3625bcca866a8c45469\\"", "size": 94730, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:50:55.138Z", "contentLength": 94730, "httpStatusCode": 200}	c7ae3561-7e14-4471-8164-116197ee5dce	\N	{}	2
ee51c5fc-fc98-4d86-a7cf-56649e2ae0c2	public	products/1770062041323-17700620071895496953068556973353.webp	\N	2026-02-02 19:54:01.211321+00	2026-02-02 19:54:01.211321+00	2026-02-02 19:54:01.211321+00	{"eTag": "\\"b4795f827a7d1ab68ec244dd224747de\\"", "size": 120542, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:54:01.204Z", "contentLength": 120542, "httpStatusCode": 200}	8b7c1e50-dfd8-4954-bc9e-f1e2e4ac3cf5	\N	{}	2
add81724-1bbd-4de8-a9da-ac94dfa2d3ca	public	products/1770062088921-17700620465104257357454596154210.webp	\N	2026-02-02 19:54:48.811899+00	2026-02-02 19:54:48.811899+00	2026-02-02 19:54:48.811899+00	{"eTag": "\\"73f5a0a5dd707f7e0d3927f640df1e51\\"", "size": 125436, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:54:48.807Z", "contentLength": 125436, "httpStatusCode": 200}	7fd4a2a8-9098-43e3-9544-fb1e27a6b0c8	\N	{}	2
e84f9d72-419b-4a85-8f2d-7b3f0c50e2ac	public	products/1770062357404-17700622906083275571824305800316.webp	\N	2026-02-02 19:59:18.116093+00	2026-02-02 19:59:18.116093+00	2026-02-02 19:59:18.116093+00	{"eTag": "\\"bd0a15627762e3a08ee31404230ce0c2\\"", "size": 118174, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:59:18.015Z", "contentLength": 118174, "httpStatusCode": 200}	e9480924-d147-4c96-912b-3fb635fa8d50	\N	{}	2
751d55d2-c9b5-44dd-8e95-735a77024f9e	public	products/1770062396783-17700623642958457355831469096059.webp	\N	2026-02-02 19:59:59.809127+00	2026-02-02 19:59:59.809127+00	2026-02-02 19:59:59.809127+00	{"eTag": "\\"f1ca9311b058d853ed37ed49a93cab36\\"", "size": 146466, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T19:59:59.001Z", "contentLength": 146466, "httpStatusCode": 200}	04406075-a895-4af2-a211-a2d058e07211	\N	{}	2
26452a77-50f9-4825-a33e-d0775360428b	public	products/1770062843873-1770062820197117674173136049737.webp	\N	2026-02-02 20:07:23.701777+00	2026-02-02 20:07:23.701777+00	2026-02-02 20:07:23.701777+00	{"eTag": "\\"892fb0c666779bda209a7818612f8c95\\"", "size": 105762, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:07:23.688Z", "contentLength": 105762, "httpStatusCode": 200}	5c2f4e86-1d6f-401c-aed7-47f3f2a50a25	\N	{}	2
97d970e8-7a23-4d05-bc6e-4a92a6668ff3	public	products/1770062863522-17700628512131288912720099763839.webp	\N	2026-02-02 20:07:42.297961+00	2026-02-02 20:07:42.297961+00	2026-02-02 20:07:42.297961+00	{"eTag": "\\"860f69adef06705e665c47d6417ed702\\"", "size": 109596, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:07:42.205Z", "contentLength": 109596, "httpStatusCode": 200}	fc26f232-0566-4294-a30a-e798cfee18c1	\N	{}	2
db959bed-aec8-4160-90c9-741084ebc1d4	public	products/1770063095004-17700630695332088696580428207990.webp	\N	2026-02-02 20:11:34.791828+00	2026-02-02 20:11:34.791828+00	2026-02-02 20:11:34.791828+00	{"eTag": "\\"a0787fafbb04972efe685b76c870eca9\\"", "size": 105432, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:11:34.702Z", "contentLength": 105432, "httpStatusCode": 200}	95a33b69-e878-42bc-b8cf-f3f2bd45448e	\N	{}	2
833d5cd0-b221-48f7-9af5-789ad6a09c82	public	products/1770063117738-1770063099434199590850453045000.webp	\N	2026-02-02 20:11:56.797113+00	2026-02-02 20:11:56.797113+00	2026-02-02 20:11:56.797113+00	{"eTag": "\\"06f1cf9fb82429bf1a9593e1497d16e3\\"", "size": 111542, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:11:56.688Z", "contentLength": 111542, "httpStatusCode": 200}	69bc6c55-9aee-4c2c-81fa-9ab32eda7b0d	\N	{}	2
8f4c600c-9b85-4657-b0a8-5ea49afd6104	public	products/1770063385113-17700632692531718148217763717893.webp	\N	2026-02-02 20:16:24.48189+00	2026-02-02 20:16:24.48189+00	2026-02-02 20:16:24.48189+00	{"eTag": "\\"17196af21fc2c582cec208ed1972d16a\\"", "size": 140028, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:16:24.391Z", "contentLength": 140028, "httpStatusCode": 200}	f3cacbe6-603e-423a-b436-79a962056242	\N	{}	2
b5bcda39-336f-425a-866f-ad7861a28949	public	products/1770063434791-17700633881731267528164537519055.webp	\N	2026-02-02 20:17:13.702523+00	2026-02-02 20:17:13.702523+00	2026-02-02 20:17:13.702523+00	{"eTag": "\\"136c9c6427f8b9945858e3816aecbd5a\\"", "size": 130396, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:17:13.681Z", "contentLength": 130396, "httpStatusCode": 200}	abffc754-ec84-4caa-b69e-723b8bea44a4	\N	{}	2
dabeb2e6-72d8-4cdf-80bf-5c67beccf66d	public	products/1770064036783-17700639841423590283503584382048.webp	\N	2026-02-02 20:27:16.387836+00	2026-02-02 20:27:16.387836+00	2026-02-02 20:27:16.387836+00	{"eTag": "\\"6a16043b15827d84de232d4075afccc2\\"", "size": 190548, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:27:16.302Z", "contentLength": 190548, "httpStatusCode": 200}	e55ec4b7-1ff0-4631-86fe-e2ebd8ae7c7e	\N	{}	2
ddf1e9c9-119f-490d-bb39-bb2ecbc68004	public	products/1770064101967-17700640442535056755218682858858.webp	\N	2026-02-02 20:28:21.700007+00	2026-02-02 20:28:21.700007+00	2026-02-02 20:28:21.700007+00	{"eTag": "\\"f0a9c07fa2fed42da9df6856532a982c\\"", "size": 156030, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:28:21.597Z", "contentLength": 156030, "httpStatusCode": 200}	436157e3-b908-4ca0-bc0c-4574e4c3a653	\N	{}	2
32c057ba-8695-4d82-8164-169a8aef4c68	public	products/1770064302859-1770064277483768594078021098691.webp	\N	2026-02-02 20:31:41.907057+00	2026-02-02 20:31:41.907057+00	2026-02-02 20:31:41.907057+00	{"eTag": "\\"0bd8705fa762befa43054e253ddadd6a\\"", "size": 94652, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:31:41.897Z", "contentLength": 94652, "httpStatusCode": 200}	efa51eaa-c3ed-4a67-b6c3-a972e0025b3f	\N	{}	2
def4d8e4-8613-46ad-9a33-8e987614992c	public	products/1770064341129-17700643064697483175374226788670.webp	\N	2026-02-02 20:32:20.308676+00	2026-02-02 20:32:20.308676+00	2026-02-02 20:32:20.308676+00	{"eTag": "\\"fa3d4ef7e4121cf219bded45eba4b667\\"", "size": 115838, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:32:20.299Z", "contentLength": 115838, "httpStatusCode": 200}	8b2b81cc-0da5-4b72-a380-6e2df0c8c8a0	\N	{}	2
2e077bb0-c7b5-4990-8a54-bbefbfcb31e9	public	products/1770064602105-17700645449882470577202980869062.webp	\N	2026-02-02 20:36:41.588952+00	2026-02-02 20:36:41.588952+00	2026-02-02 20:36:41.588952+00	{"eTag": "\\"5f34eeb4c12e05f3c32031e04ec3ac31\\"", "size": 117868, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:36:41.500Z", "contentLength": 117868, "httpStatusCode": 200}	280677d0-a176-4d4d-9d1d-51a3b52608f1	\N	{}	2
70b7d7e1-da41-4198-b4d5-a3aa90dff16c	public	products/1770064678340-17700646072718097911451412371085.webp	\N	2026-02-02 20:37:57.299148+00	2026-02-02 20:37:57.299148+00	2026-02-02 20:37:57.299148+00	{"eTag": "\\"f4bd2e7a5e43c50a7d9365240c7c1ec5\\"", "size": 110428, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:37:57.292Z", "contentLength": 110428, "httpStatusCode": 200}	a126b4c2-8c4e-4c9c-ae2f-04dd4e8b0302	\N	{}	2
cf3513d9-d44a-434d-a60a-087e32ea6217	public	products/1770064820496-17700648007399167503952869926817.webp	\N	2026-02-02 20:40:19.698998+00	2026-02-02 20:40:19.698998+00	2026-02-02 20:40:19.698998+00	{"eTag": "\\"0d55618b9610325c9c31307ee940022c\\"", "size": 123340, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:40:19.685Z", "contentLength": 123340, "httpStatusCode": 200}	68ad2351-5e0e-4005-950f-2c1e9d255c11	\N	{}	2
8cfcb262-4f85-49ab-8a2c-678a67357554	public	products/1770064852850-17700648264067786786429402923056.webp	\N	2026-02-02 20:40:51.994272+00	2026-02-02 20:40:51.994272+00	2026-02-02 20:40:51.994272+00	{"eTag": "\\"21f42e1ceb9cbb632a1413ddb20f4bc2\\"", "size": 114804, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:40:51.903Z", "contentLength": 114804, "httpStatusCode": 200}	faba85dc-6bd8-47b1-b00e-2df15f5619cf	\N	{}	2
69e26df4-2926-48f5-889e-2b0664fad048	public	products/1770065012117-17700649931465272108103786082394.webp	\N	2026-02-02 20:43:31.200854+00	2026-02-02 20:43:31.200854+00	2026-02-02 20:43:31.200854+00	{"eTag": "\\"dcb120a10311b64961e594809433cf5e\\"", "size": 130378, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:43:31.193Z", "contentLength": 130378, "httpStatusCode": 200}	79db7b36-4bbe-40fd-b9cd-13091ec764ce	\N	{}	2
064e9a32-46c6-4165-a1d6-97088d892475	public	products/1770065214971-1770065089038848602824145856200.webp	\N	2026-02-02 20:46:54.51229+00	2026-02-02 20:46:54.51229+00	2026-02-02 20:46:54.51229+00	{"eTag": "\\"adafa0e350771a1febca45d6e48134bf\\"", "size": 92638, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-02T20:46:54.505Z", "contentLength": 92638, "httpStatusCode": 200}	5cc52819-782e-431a-91e5-d464282d720a	\N	{}	2
081f6bdc-dca9-40fb-8914-9fdd4614e94c	public	products/1770126795246-17701267291377676349526174087240.webp	\N	2026-02-03 13:53:14.330375+00	2026-02-03 13:53:14.330375+00	2026-02-03 13:53:14.330375+00	{"eTag": "\\"7170db3c60177ea5d136da960de1e43f\\"", "size": 75970, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T13:53:14.244Z", "contentLength": 75970, "httpStatusCode": 200}	8264ff0e-9c64-46d0-996a-429a5ea0dff9	\N	{}	2
f81e96fc-4792-4ba7-bb78-c87f1f24cfa7	public	products/1770128195001-17701281501346861287967483372373.webp	\N	2026-02-03 14:16:34.031162+00	2026-02-03 14:16:34.031162+00	2026-02-03 14:16:34.031162+00	{"eTag": "\\"3de9decbf95f0f2d6ea6a2a276a554dd\\"", "size": 60280, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:16:33.951Z", "contentLength": 60280, "httpStatusCode": 200}	384ad7bd-7e1b-484e-b26e-e5110168f30e	\N	{}	2
f235effd-f4e0-4641-a50e-71312d00b458	public	products/1770128543931-17701285306435070128108612230464.webp	\N	2026-02-03 14:22:22.954547+00	2026-02-03 14:22:22.954547+00	2026-02-03 14:22:22.954547+00	{"eTag": "\\"4f3b5f1ae9d2c0b1d218f893e65973aa\\"", "size": 92564, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:22:22.940Z", "contentLength": 92564, "httpStatusCode": 200}	a4dd0530-a9e5-4b6c-8695-6683d221e83f	\N	{}	2
0273f179-4cec-40c8-b676-0acc8b2b3e65	public	products/1770128583773-17701285510706059456085452923453.webp	\N	2026-02-03 14:23:02.628202+00	2026-02-03 14:23:02.628202+00	2026-02-03 14:23:02.628202+00	{"eTag": "\\"a249503b2304c797b59fd842ad381cc2\\"", "size": 129724, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:23:02.547Z", "contentLength": 129724, "httpStatusCode": 200}	ee0df0c0-ec7d-43a6-a888-a57d0b5d9984	\N	{}	2
79cb5667-8bac-420e-8be0-500fd536fb4b	public	products/1770129013855-17701289644936022049168306671914.webp	\N	2026-02-03 14:30:12.549496+00	2026-02-03 14:30:12.549496+00	2026-02-03 14:30:12.549496+00	{"eTag": "\\"b2992c2a8382eea1a70ec51c2d757814\\"", "size": 69706, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:30:12.541Z", "contentLength": 69706, "httpStatusCode": 200}	78fd3d59-7ce2-4945-9212-96d3331fcce0	\N	{}	2
43613a1a-42ca-4d8d-ac6c-f4a7c4e0ee5d	public	products/1770129226993-17701292143832045559227822558933.webp	\N	2026-02-03 14:33:45.552347+00	2026-02-03 14:33:45.552347+00	2026-02-03 14:33:45.552347+00	{"eTag": "\\"6d27de053b90a945b7313bec25cfa9a8\\"", "size": 42152, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:33:45.544Z", "contentLength": 42152, "httpStatusCode": 200}	af3e9881-fcb5-4c55-a976-be4a33bf0e59	\N	{}	2
50b5caad-fa29-43aa-a93d-0125304591dc	public	products/1770129441095-17701294168948685223729849594876.webp	\N	2026-02-03 14:37:19.749523+00	2026-02-03 14:37:19.749523+00	2026-02-03 14:37:19.749523+00	{"eTag": "\\"defbaa820b49575a7c748b1f55774493\\"", "size": 85816, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:37:19.741Z", "contentLength": 85816, "httpStatusCode": 200}	572084c9-ccfd-49d1-b9ce-ec4e530e989f	\N	{}	2
b80c233c-1624-4741-95d1-764f7b05b167	public	products/1770129620906-17701295614442684254266209630305.webp	\N	2026-02-03 14:40:19.43988+00	2026-02-03 14:40:19.43988+00	2026-02-03 14:40:19.43988+00	{"eTag": "\\"c8b46172a93296ed08f68855048ade5d\\"", "size": 92382, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:40:19.430Z", "contentLength": 92382, "httpStatusCode": 200}	84cfe3eb-0b90-43b6-9ede-0f69ef1bba98	\N	{}	2
9101b4d1-1917-4a95-82ef-039039b4118e	public	products/1770130023310-1770130008282490745723131829005.webp	\N	2026-02-03 14:47:02.123859+00	2026-02-03 14:47:02.123859+00	2026-02-03 14:47:02.123859+00	{"eTag": "\\"cff3a6841363f4ae20bfce39033424fe\\"", "size": 88368, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:47:02.038Z", "contentLength": 88368, "httpStatusCode": 200}	13251a9c-2ea8-4cad-a669-344f7d6986f4	\N	{}	2
43ab9d80-8b2a-4478-b4d0-94d847c1f989	public	products/1770130366586-17701303047758204823445275838817.webp	\N	2026-02-03 14:52:45.239838+00	2026-02-03 14:52:45.239838+00	2026-02-03 14:52:45.239838+00	{"eTag": "\\"13780cabdbb273b5845b9c36e4b33134\\"", "size": 93534, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T14:52:45.233Z", "contentLength": 93534, "httpStatusCode": 200}	03b9cbfb-a007-4551-9e42-eff9b7cb3ff7	\N	{}	2
629d390b-6de8-48c8-b8a5-66eb460d1be3	public	products/1770130818360-17701308037332875846956477712757.webp	\N	2026-02-03 15:00:17.228692+00	2026-02-03 15:00:17.228692+00	2026-02-03 15:00:17.228692+00	{"eTag": "\\"bddefb42ba474a8030eb961568eae83f\\"", "size": 101580, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:00:17.152Z", "contentLength": 101580, "httpStatusCode": 200}	a0a6c3ec-008e-4013-9514-29313f0cd8a1	\N	{}	2
26ebec07-21da-474e-89e9-f79121b3e229	public	products/1770131031823-1770130934921570425912928441036.webp	\N	2026-02-03 15:03:50.456283+00	2026-02-03 15:03:50.456283+00	2026-02-03 15:03:50.456283+00	{"eTag": "\\"6b1c41dba7d5bd738130cbf4c31074d5\\"", "size": 68766, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:03:50.444Z", "contentLength": 68766, "httpStatusCode": 200}	6f49e9b4-dea0-4f17-bd6b-36978fbfcd00	\N	{}	2
cb1ef954-addd-4dcd-9e9c-fb236e07df1f	public	products/1770131297861-17701312684958612019720912996840.webp	\N	2026-02-03 15:08:16.437902+00	2026-02-03 15:08:16.437902+00	2026-02-03 15:08:16.437902+00	{"eTag": "\\"c14fa1d489f50accc42bd74ad62a4c4d\\"", "size": 80562, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:08:16.432Z", "contentLength": 80562, "httpStatusCode": 200}	1fb845b6-3b46-4b95-97c3-5a8152124907	\N	{}	2
de561957-3e54-4ce9-b433-158f6ed20ff5	public	products/1770131409438-17701313718227100036019267256841.webp	\N	2026-02-03 15:10:07.837415+00	2026-02-03 15:10:07.837415+00	2026-02-03 15:10:07.837415+00	{"eTag": "\\"330c7214f36674bb990fa1c252926987\\"", "size": 67614, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:10:07.831Z", "contentLength": 67614, "httpStatusCode": 200}	7d7d5157-358d-421a-8bec-99ca36719136	\N	{}	2
e9a555d8-e5e6-48e8-9791-8a7b297c7d63	public	products/1770131624269-17701315571642943042206800759166.webp	\N	2026-02-03 15:13:43.129569+00	2026-02-03 15:13:43.129569+00	2026-02-03 15:13:43.129569+00	{"eTag": "\\"93e79076ca37cc2bc500bae908c3d2c2\\"", "size": 122492, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:13:43.049Z", "contentLength": 122492, "httpStatusCode": 200}	54e4a527-a23f-47f1-a7e7-798a0004b429	\N	{}	2
4521a192-5966-44fc-a6a1-224b4a8398be	public	products/1770131757091-17701317333836617606364851882820.webp	\N	2026-02-03 15:15:55.724782+00	2026-02-03 15:15:55.724782+00	2026-02-03 15:15:55.724782+00	{"eTag": "\\"9597443d8576a242959fab9b12c5e49f\\"", "size": 80248, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:15:55.630Z", "contentLength": 80248, "httpStatusCode": 200}	5bd5cd35-2433-4e40-9256-7d3a14450555	\N	{}	2
fa2f6422-d1b8-44af-919e-35d146b2d328	public	products/1770131854195-17701318237569125116557300265575.webp	\N	2026-02-03 15:17:32.934893+00	2026-02-03 15:17:32.934893+00	2026-02-03 15:17:32.934893+00	{"eTag": "\\"fa0a7b0fce3d95a646b91a47979ec79d\\"", "size": 83842, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:17:32.849Z", "contentLength": 83842, "httpStatusCode": 200}	530947a8-ab9a-417c-a1d5-f055e7595609	\N	{}	2
e60fdbda-1a24-41d3-b265-c7fcfdfb6433	public	products/1770132061148-17701320289601243785631127606565.webp	\N	2026-02-03 15:20:59.825698+00	2026-02-03 15:20:59.825698+00	2026-02-03 15:20:59.825698+00	{"eTag": "\\"c060e20f95db1df76eabe6f85511f437\\"", "size": 86696, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:20:59.750Z", "contentLength": 86696, "httpStatusCode": 200}	fb8a6c26-a62e-44d2-af35-52e63163610a	\N	{}	2
5eaa557f-80f9-459d-b78d-a1be3faf90cd	public	products/1770132142905-17701321172871283548758969296013.webp	\N	2026-02-03 15:22:21.929419+00	2026-02-03 15:22:21.929419+00	2026-02-03 15:22:21.929419+00	{"eTag": "\\"66c44a6fbb3fd2059345199b27ff6139\\"", "size": 84514, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-03T15:22:21.924Z", "contentLength": 84514, "httpStatusCode": 200}	63d798c6-bfc9-42f2-81fb-1ffa625b7f02	\N	{}	2
35e0e3d8-94cc-4cf8-8482-734b91cd3fd4	public	products/1770657615829-note_9s.webp	\N	2026-02-09 17:20:15.998352+00	2026-02-09 17:20:15.998352+00	2026-02-09 17:20:15.998352+00	{"eTag": "\\"1645eb78a8993b79e576c2268d6563f3\\"", "size": 13668, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-09T17:20:15.979Z", "contentLength": 13668, "httpStatusCode": 200}	9300f6a2-5f17-4f91-9b5c-9796929cf806	\N	{}	2
96207f1d-01fd-4d7a-8f24-733cd770d234	public	products/1770657654350-note_9s.webp	\N	2026-02-09 17:20:54.388515+00	2026-02-09 17:20:54.388515+00	2026-02-09 17:20:54.388515+00	{"eTag": "\\"1645eb78a8993b79e576c2268d6563f3\\"", "size": 13668, "mimetype": "image/webp", "cacheControl": "no-cache", "lastModified": "2026-02-09T17:20:54.381Z", "contentLength": 13668, "httpStatusCode": 200}	08e806fa-2046-41a0-b04f-9eaea819dcfc	\N	{}	2
15e1f372-4b84-41d6-830d-740bef28d300	public	test-cors.txt	\N	2026-02-23 17:44:46.674451+00	2026-02-23 17:44:46.674451+00	2026-02-23 17:44:46.674451+00	{"eTag": "\\"1510a33c95bd5477005d2c0053ca9f41\\"", "size": 16, "mimetype": "text/plain", "cacheControl": "no-cache", "lastModified": "2026-02-23T17:44:46.641Z", "contentLength": 16, "httpStatusCode": 200}	f1c8f982-36fb-4b66-a7ef-ded9703d2c6c	\N	{}	1
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
public	sellers	2026-01-29 17:24:56.508102+00	2026-01-29 17:24:56.508102+00
public	sellers/profile	2026-01-29 17:24:56.508102+00	2026-01-29 17:24:56.508102+00
public	products	2026-01-30 14:53:37.016516+00	2026-01-30 14:53:37.016516+00
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id);


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (catalog_id, name);


--
-- Name: idx_iceberg_tables_location; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_tables_location ON storage.iceberg_tables USING btree (location);


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (catalog_id, namespace_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: iceberg_namespaces iceberg_namespaces_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES storage.iceberg_namespaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: objects auth_delete_public_bucket; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY auth_delete_public_bucket ON storage.objects FOR DELETE USING ((bucket_id = 'public'::text));


--
-- Name: objects auth_insert_public_bucket; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY auth_insert_public_bucket ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'public'::text));


--
-- Name: objects auth_update_public_bucket; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY auth_update_public_bucket ON storage.objects FOR UPDATE USING ((bucket_id = 'public'::text)) WITH CHECK ((bucket_id = 'public'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: objects public_read_public_bucket; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY public_read_public_bucket ON storage.objects FOR SELECT USING ((bucket_id = 'public'::text));


--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict Pju1GNxH4FccTwsrKMJcURTxPFsnKg3Wyo7CD60o4ffk7TAbsfipLfaE8wdRph2

