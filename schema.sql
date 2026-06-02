-- 1. Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create public.users table referencing auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'pro')),
    username TEXT,
    daily_ai_requests INT NOT NULL DEFAULT 0,
    last_request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tdee_target NUMERIC NOT NULL DEFAULT 2000,
    protein_target NUMERIC NOT NULL DEFAULT 150,
    carbs_target NUMERIC NOT NULL DEFAULT 200,
    fat_target NUMERIC NOT NULL DEFAULT 65
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for users table
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 3. Trigger to automatically create a public.users row on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, role, username, daily_ai_requests, last_request_date, tdee_target, protein_target, carbs_target, fat_target)
    VALUES (
        new.id, 
        'free', 
        COALESCE(new.raw_user_meta_data ->> 'username', 'User_' || substr(new.id::text, 1, 8)),
        0, 
        CURRENT_DATE, 
        2000, 
        150, 
        200, 
        65
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_calories NUMERIC NOT NULL DEFAULT 0,
    total_protein NUMERIC NOT NULL DEFAULT 0,
    total_carbs NUMERIC NOT NULL DEFAULT 0,
    total_fat NUMERIC NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Enable RLS on daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for daily_logs
CREATE POLICY "Users can manage their own daily logs"
    ON public.daily_logs
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Create food_entries table
CREATE TABLE IF NOT EXISTS public.food_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    parsed_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    calories NUMERIC NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs_target NUMERIC, -- Just keeping structural definition safe
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS on food_entries
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for food_entries (bound to their user logs)
CREATE POLICY "Users can manage food entries of their own logs"
    ON public.food_entries
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_logs
            WHERE public.daily_logs.id = food_entries.log_id
            AND public.daily_logs.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.daily_logs
            WHERE public.daily_logs.id = food_entries.log_id
            AND public.daily_logs.user_id = auth.uid()
        )
    );

-- 6. Trigger to automatically calculate and update daily_logs totals when food_entries change
CREATE OR REPLACE FUNCTION public.update_daily_log_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_log_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_log_id := OLD.log_id;
    ELSE
        target_log_id := NEW.log_id;
    END IF;

    UPDATE public.daily_logs
    SET 
        total_calories = COALESCE((SELECT SUM(calories) FROM public.food_entries WHERE log_id = target_log_id), 0),
        total_protein = COALESCE((SELECT SUM(protein) FROM public.food_entries WHERE log_id = target_log_id), 0),
        total_carbs = COALESCE((SELECT SUM(carbs) FROM public.food_entries WHERE log_id = target_log_id), 0),
        total_fat = COALESCE((SELECT SUM(fat) FROM public.food_entries WHERE log_id = target_log_id), 0)
    WHERE id = target_log_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_food_entry_change
    AFTER INSERT OR UPDATE OR DELETE ON public.food_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_daily_log_totals();

-- 7. Create saved_foods table (User personal foods database)
CREATE TABLE IF NOT EXISTS public.saved_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    base_serving_description TEXT NOT NULL,
    calories NUMERIC NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS on saved_foods
ALTER TABLE public.saved_foods ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for saved_foods
CREATE POLICY "Users can manage their own saved foods"
    ON public.saved_foods
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
