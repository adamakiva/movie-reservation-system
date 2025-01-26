CREATE TABLE "genre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genre_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"rows" smallint NOT NULL,
	"columns" smallint NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hall_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "movie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" varchar NOT NULL,
	"price" real NOT NULL,
	"genre_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_poster" (
	"movie_id" uuid PRIMARY KEY NOT NULL,
	"absolute_path" varchar NOT NULL,
	"mime_type" varchar NOT NULL,
	"size_in_bytes" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "showtime" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp (3) with time zone NOT NULL,
	"reservations" "point"[] DEFAULT ARRAY[]::point[] NOT NULL,
	"movie_id" uuid NOT NULL,
	"hall_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "showtime_at" UNIQUE("at","hall_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"hash" varchar NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_showtime" (
	"user_id" uuid NOT NULL,
	"showtime_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movie" ADD CONSTRAINT "movie_genre_id_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movie_poster" ADD CONSTRAINT "movie_poster_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "showtime" ADD CONSTRAINT "showtime_movie_id_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "showtime" ADD CONSTRAINT "showtime_hall_id_hall_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."hall"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_showtime" ADD CONSTRAINT "user_showtime_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_showtime" ADD CONSTRAINT "user_showtime_showtime_id_showtime_id_fk" FOREIGN KEY ("showtime_id") REFERENCES "public"."showtime"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "movie_genre_id_index" ON "movie" USING btree ("genre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movie_cursor_unique_index" ON "movie" USING btree ("id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_name_unique_index" ON "role" USING btree ("name");--> statement-breakpoint
CREATE INDEX "showtime_movie_index" ON "showtime" USING btree ("movie_id");--> statement-breakpoint
CREATE INDEX "showtime_hall_index" ON "showtime" USING btree ("hall_id");--> statement-breakpoint
CREATE UNIQUE INDEX "showtime_cursor_unique_index" ON "showtime" USING btree ("id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_index" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_id_index" ON "user" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_cursor_unique_index" ON "user" USING btree ("id","created_at");--> statement-breakpoint
CREATE INDEX "user_showtime_user_index" ON "user_showtime" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_showtime_showtime_index" ON "user_showtime" USING btree ("showtime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_showtime_unique_index" ON "user_showtime" USING btree ("showtime_id","user_id");