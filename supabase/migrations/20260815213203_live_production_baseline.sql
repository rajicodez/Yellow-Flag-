


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'user',
    'host',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."prediction_answer_type" AS ENUM (
    'driver',
    'constructor'
);


ALTER TYPE "public"."prediction_answer_type" OWNER TO "postgres";


CREATE TYPE "public"."prediction_competition" AS ENUM (
    'user',
    'host'
);


ALTER TYPE "public"."prediction_competition" OWNER TO "postgres";


CREATE TYPE "public"."race_status" AS ENUM (
    'draft',
    'open',
    'locked',
    'scored',
    'published'
);


ALTER TYPE "public"."race_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Yellow Flag User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;


ALTER FUNCTION "public"."has_role"("required_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.race_questions as question
    join public.races as race on race.id = question.race_id
    where question.id = p_question_id
      and question.is_active = true
      and race.status <> 'draft'::public.race_status
  );
$$;


ALTER FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jsonb_object_length"("input_value" "jsonb") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT PARALLEL SAFE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select count(*)::integer
  from jsonb_object_keys(input_value);
$$;


ALTER FUNCTION "public"."jsonb_object_length"("input_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_profile_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") RETURNS TABLE("entry_id" "uuid", "submitted_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid;
  selected_race public.races%rowtype;
  saved_entry_id uuid;
  saved_submission_time timestamptz;
  required_question_count integer;
  invalid_question_key text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication is required to submit a prediction.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Prediction answers must be a JSON object.';
  end if;

  select *
  into selected_race
  from public.races
  where slug = p_race_slug;

  if not found then
    raise exception 'Race not found.';
  end if;

  if selected_race.status <> 'open' then
    raise exception 'Predictions are not open for this race.';
  end if;

  if now() < selected_race.opens_at then
    raise exception 'Predictions have not opened yet.';
  end if;

  if now() >= selected_race.closes_at then
    raise exception 'The prediction deadline has passed.';
  end if;

  if p_competition = 'host' then
    if not (
      public.has_role('host'::public.app_role)
      and exists (
        select 1
        from public.host_profiles
        where host_profiles.user_id = current_user_id
      )
    ) then
      raise exception 'This account is not authorized for host predictions.';
    end if;
  end if;

  select count(*)
  into required_question_count
  from public.race_questions
  where race_id = selected_race.id
    and is_active = true;

  if required_question_count <> 7 then
    raise exception 'This race does not have exactly seven active questions.';
  end if;

  if public.jsonb_object_length(p_answers) <> required_question_count then
    raise exception 'All seven questions must be answered.';
  end if;

  if exists (
    select 1
    from public.race_questions
    where race_id = selected_race.id
      and is_active = true
      and (
        not (p_answers ? question_key)
        or nullif(btrim(p_answers ->> question_key), '') is null
      )
  ) then
    raise exception 'One or more required answers are missing.';
  end if;

  select question.question_key
  into invalid_question_key
  from public.race_questions as question
  where question.race_id = selected_race.id
    and question.is_active = true
    and not exists (
      select 1
      from public.race_question_options as option
      where option.question_id = question.id
        and option.option_value = p_answers ->> question.question_key
        and option.is_active = true
    )
  order by question.question_number
  limit 1;

  if invalid_question_key is not null then
    raise exception 'Invalid answer for question: %', invalid_question_key;
  end if;

  if btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p2_finisher')
     or btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p3_finisher')
     or btrim(p_answers ->> 'p2_finisher') = btrim(p_answers ->> 'p3_finisher') then
    raise exception 'Winner, P2 and P3 must be three different drivers.';
  end if;

  saved_submission_time := now();

  insert into public.prediction_entries (
    race_id,
    user_id,
    competition,
    status,
    submitted_at,
    updated_at
  )
  values (
    selected_race.id,
    current_user_id,
    p_competition,
    'submitted',
    saved_submission_time,
    saved_submission_time
  )
  on conflict (race_id, user_id, competition)
  do update set
    status = 'submitted',
    submitted_at = excluded.submitted_at,
    updated_at = excluded.updated_at
  returning id into saved_entry_id;

  delete from public.prediction_answers
  where prediction_answers.entry_id = saved_entry_id;

  insert into public.prediction_answers (
    entry_id,
    question_id,
    answer_value,
    created_at,
    updated_at
  )
  select
    saved_entry_id,
    race_questions.id,
    btrim(p_answers ->> race_questions.question_key),
    saved_submission_time,
    saved_submission_time
  from public.race_questions
  where race_questions.race_id = selected_race.id
    and race_questions.is_active = true;

  return query
  select saved_entry_id, saved_submission_time;
end;
$$;


ALTER FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") IS 'Authenticated prediction upsert with server timing, host authorization, exact option validation, and distinct winner/P2/P3 enforcement before writes.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."host_profiles" (
    "user_id" "uuid" NOT NULL,
    "host_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "host_profiles_host_name_check" CHECK (("host_name" = ANY (ARRAY['Lakindu'::"text", 'Kasun'::"text"])))
);


ALTER TABLE "public"."host_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prediction_answers" (
    "entry_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prediction_answers_answer_value_check" CHECK (("length"("btrim"("answer_value")) > 0))
);


ALTER TABLE "public"."prediction_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prediction_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "competition" "public"."prediction_competition" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prediction_entries_status_check" CHECK (("status" = 'submitted'::"text"))
);


ALTER TABLE "public"."prediction_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."race_question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_value" "text" NOT NULL,
    "option_label" "text" NOT NULL,
    "option_type" "public"."prediction_answer_type" NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "race_question_options_option_label_check" CHECK (("length"("btrim"("option_label")) > 0)),
    CONSTRAINT "race_question_options_option_value_check" CHECK (("length"("btrim"("option_value")) > 0)),
    CONSTRAINT "race_question_options_sort_order_check" CHECK (("sort_order" > 0))
);


ALTER TABLE "public"."race_question_options" OWNER TO "postgres";


COMMENT ON TABLE "public"."race_question_options" IS 'Server-authoritative allowed answer values for an individual race question.';



COMMENT ON COLUMN "public"."race_question_options"."option_value" IS 'Exact value accepted by submit_prediction for this question.';



COMMENT ON COLUMN "public"."race_question_options"."option_label" IS 'Display label corresponding to option_value.';



CREATE TABLE IF NOT EXISTS "public"."race_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" "uuid" NOT NULL,
    "question_number" integer NOT NULL,
    "question_key" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "answer_type" "public"."prediction_answer_type" NOT NULL,
    "points" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "race_questions_points_check" CHECK (("points" = 1)),
    CONSTRAINT "race_questions_question_number_check" CHECK ((("question_number" >= 1) AND ("question_number" <= 7)))
);


ALTER TABLE "public"."race_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."races" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "slug" "text" NOT NULL,
    "race_name" "text" NOT NULL,
    "circuit_name" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "opens_at" timestamp with time zone NOT NULL,
    "closes_at" timestamp with time zone NOT NULL,
    "race_starts_at" timestamp with time zone NOT NULL,
    "status" "public"."race_status" DEFAULT 'draft'::"public"."race_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "races_round_number_check" CHECK (("round_number" > 0)),
    CONSTRAINT "races_valid_time_order" CHECK ((("opens_at" < "closes_at") AND ("closes_at" < "race_starts_at")))
);


ALTER TABLE "public"."races" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seasons_year_check" CHECK ((("year" >= 2020) AND ("year" <= 2100)))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_host_name_key" UNIQUE ("host_name");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."prediction_answers"
    ADD CONSTRAINT "prediction_answers_pkey" PRIMARY KEY ("entry_id", "question_id");



ALTER TABLE ONLY "public"."prediction_entries"
    ADD CONSTRAINT "prediction_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prediction_entries"
    ADD CONSTRAINT "prediction_entries_race_id_user_id_competition_key" UNIQUE ("race_id", "user_id", "competition");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_question_options"
    ADD CONSTRAINT "race_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_question_options"
    ADD CONSTRAINT "race_question_options_question_sort_key" UNIQUE ("question_id", "sort_order");



ALTER TABLE ONLY "public"."race_question_options"
    ADD CONSTRAINT "race_question_options_question_value_key" UNIQUE ("question_id", "option_value");



ALTER TABLE ONLY "public"."race_questions"
    ADD CONSTRAINT "race_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_questions"
    ADD CONSTRAINT "race_questions_race_id_question_key_key" UNIQUE ("race_id", "question_key");



ALTER TABLE ONLY "public"."race_questions"
    ADD CONSTRAINT "race_questions_race_id_question_number_key" UNIQUE ("race_id", "question_number");



ALTER TABLE ONLY "public"."races"
    ADD CONSTRAINT "races_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."races"
    ADD CONSTRAINT "races_season_id_round_number_key" UNIQUE ("season_id", "round_number");



ALTER TABLE ONLY "public"."races"
    ADD CONSTRAINT "races_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_year_key" UNIQUE ("year");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role");



CREATE INDEX "prediction_answers_question_id_index" ON "public"."prediction_answers" USING "btree" ("question_id");



CREATE INDEX "prediction_entries_race_id_index" ON "public"."prediction_entries" USING "btree" ("race_id");



CREATE INDEX "prediction_entries_user_id_index" ON "public"."prediction_entries" USING "btree" ("user_id");



CREATE INDEX "race_question_options_active_question_sort_idx" ON "public"."race_question_options" USING "btree" ("question_id", "sort_order") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_profile_updated_at"();



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prediction_answers"
    ADD CONSTRAINT "prediction_answers_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."prediction_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prediction_answers"
    ADD CONSTRAINT "prediction_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."race_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prediction_entries"
    ADD CONSTRAINT "prediction_entries_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prediction_entries"
    ADD CONSTRAINT "prediction_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."race_question_options"
    ADD CONSTRAINT "race_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."race_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."race_questions"
    ADD CONSTRAINT "race_questions_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."races"
    ADD CONSTRAINT "races_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."host_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "host_profiles_select_own" ON "public"."host_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."prediction_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prediction_answers_select_own" ON "public"."prediction_answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prediction_entries"
  WHERE (("prediction_entries"."id" = "prediction_answers"."entry_id") AND ("prediction_entries"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."prediction_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prediction_entries_select_own" ON "public"."prediction_entries" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."race_question_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "race_question_options_select_visible" ON "public"."race_question_options" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND "public"."is_prediction_question_visible"("question_id")));



ALTER TABLE "public"."race_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "race_questions_select_visible" ON "public"."race_questions" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."races"
  WHERE (("races"."id" = "race_questions"."race_id") AND ("races"."status" <> 'draft'::"public"."race_status"))))));



ALTER TABLE "public"."races" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "races_select_visible" ON "public"."races" FOR SELECT TO "authenticated", "anon" USING (("status" <> 'draft'::"public"."race_status"));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_select_active" ON "public"."seasons" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select_own" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TYPE "public"."app_role" TO "authenticated";



GRANT ALL ON TYPE "public"."prediction_answer_type" TO "authenticated";



GRANT ALL ON TYPE "public"."prediction_competition" TO "authenticated";



GRANT ALL ON TYPE "public"."race_status" TO "anon";
GRANT ALL ON TYPE "public"."race_status" TO "authenticated";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_prediction_question_visible"("p_question_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."jsonb_object_length"("input_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jsonb_object_length"("input_value" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_prediction"("p_race_slug" "text", "p_competition" "public"."prediction_competition", "p_answers" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."host_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."host_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."prediction_answers" TO "service_role";
GRANT SELECT ON TABLE "public"."prediction_answers" TO "authenticated";



GRANT ALL ON TABLE "public"."prediction_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."prediction_entries" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."race_question_options" TO "service_role";
GRANT SELECT ON TABLE "public"."race_question_options" TO "anon";
GRANT SELECT ON TABLE "public"."race_question_options" TO "authenticated";



GRANT ALL ON TABLE "public"."race_questions" TO "service_role";
GRANT SELECT ON TABLE "public"."race_questions" TO "authenticated";



GRANT ALL ON TABLE "public"."races" TO "service_role";
GRANT SELECT ON TABLE "public"."races" TO "anon";
GRANT SELECT ON TABLE "public"."races" TO "authenticated";



GRANT ALL ON TABLE "public"."seasons" TO "service_role";
GRANT SELECT ON TABLE "public"."seasons" TO "anon";
GRANT SELECT ON TABLE "public"."seasons" TO "authenticated";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."user_roles" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































