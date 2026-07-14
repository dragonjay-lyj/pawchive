-- ============================================================
-- Pawchive Supabase Schema
-- Run in Supabase SQL Editor: https://app.supabase.com
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Profiles — extends Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  pawchive_session TEXT,          -- upstream pawchive.pw session cookie
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Favorites — local favorites (independent of upstream API)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service       TEXT NOT NULL,         -- patreon, fanbox, fantia, etc.
  creator_id    TEXT NOT NULL,         -- upstream creator id
  post_id       TEXT,                  -- NULL = creator-level favorite
  type          TEXT NOT NULL CHECK (type IN ('creator', 'post')),
  title         TEXT,
  creator_name  TEXT,
  thumb_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, service, creator_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(user_id, type);

-- RLS: users can only see/change their own favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- User Posts — manually managed posts
-- ============================================================
CREATE TABLE IF NOT EXISTS user_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service       TEXT NOT NULL,
  creator_id    TEXT NOT NULL,
  post_id       TEXT,                  -- upstream post id (nullable for brand-new posts)
  title         TEXT NOT NULL,
  content       TEXT,                  -- description / body
  published     TIMESTAMPTZ,
  is_new        BOOLEAN NOT NULL DEFAULT false,  -- true = not from upstream
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_id);

ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view posts; only the author can edit/delete
CREATE POLICY "Everyone can view posts"
  ON user_posts FOR SELECT
  USING (true);

CREATE POLICY "Authors can insert their posts"
  ON user_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their posts"
  ON user_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their posts"
  ON user_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Post Attachments — download links / file references
-- ============================================================
CREATE TABLE IF NOT EXISTS post_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT,                  -- download link
  file_path     TEXT,                  -- relative path on pawchive CDN
  size          BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_post ON post_attachments(post_id);

ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;

-- Everyone can view attachments
CREATE POLICY "Everyone can view attachments"
  ON post_attachments FOR SELECT
  USING (true);

-- Only the post author can insert/update/delete attachments
CREATE POLICY "Authors can manage attachments"
  ON post_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_posts
      WHERE user_posts.id = post_attachments.post_id
      AND user_posts.user_id = auth.uid()
    )
  );

-- ============================================================
-- Profiles RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- Site Config — global settings (DeepLX URL, AI endpoint, etc.)
-- Public read, admin write via API (uses service_role client)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_config (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  translation_base_url TEXT NOT NULL DEFAULT '',
  translation_api_key TEXT NOT NULL DEFAULT '',
  ai_search_endpoint   TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default row
INSERT INTO site_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read site config (needed for translation proxy)
CREATE POLICY "Public read site_config"
  ON site_config FOR SELECT
  USING (true);

-- Admin users can write site config (requires is_admin on profile)
CREATE POLICY "Admin write site_config"
  ON site_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
