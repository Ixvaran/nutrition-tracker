import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

interface SearchParams {
  date?: string
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get selected date (default to today's date)
  const resolvedParams = await searchParams
  const todayStr = new Date().toISOString().split('T')[0]
  const selectedDate = resolvedParams.date || todayStr

  // 1. Fetch user profile
  let { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // If profile row doesn't exist, create it as safe fallback
    const { data: newProfile, error: createProfileError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        role: 'free',
        username: user.user_metadata?.username || 'User_' + user.id.substring(0, 8),
        daily_ai_requests: 0,
        last_request_date: todayStr,
        tdee_target: 2000,
        protein_target: 150,
        carbs_target: 200,
        fat_target: 65,
      })
      .select('*')
      .single()

    if (createProfileError) {
      console.error('Failed to create fallback profile:', createProfileError.message)
      throw new Error('Failed to load user profile details')
    }
    profile = newProfile
  }

  // 2. Fetch daily log for selected date
  const { data: dailyLog } = await supabase
    .from('daily_logs')
    .select('id, total_calories, total_protein, total_carbs, total_fat')
    .eq('user_id', user.id)
    .eq('date', selectedDate)
    .single()

  // 3. Fetch food entries if log exists
  let foodEntries: any[] = []
  if (dailyLog?.id) {
    const { data: entries, error: entriesError } = await supabase
      .from('food_entries')
      .select('id, raw_input, parsed_ingredients, calories, protein, carbs, fat')
      .eq('log_id', dailyLog.id)
      .order('id', { ascending: true })

    if (!entriesError && entries) {
      foodEntries = entries
    }
  }

  // 4. Fetch personal saved foods database
  const { data: savedFoods } = await supabase
    .from('saved_foods')
    .select('id, food_name, base_serving_description, calories, protein, carbs, fat')
    .eq('user_id', user.id)
    .order('food_name', { ascending: true })

  return (
    <Dashboard
      profile={profile}
      dailyLog={dailyLog || null}
      foodEntries={foodEntries}
      savedFoods={savedFoods || []}
      selectedDate={selectedDate}
    />
  )
}
