'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { recalculateMacrosSchema, addFoodSchema, type RecalculateMacrosInput } from '@/lib/schemas'

export async function signUp(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
      data: {
        username: username || undefined
      }
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Next.js page will redirect or show a check email message
  return { success: 'Check your email for the confirmation link, or log in if auto-confirmed!' }
}

export async function signIn(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  redirect('/')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}

export async function recalculateMacros(input: RecalculateMacrosInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Mifflin-St Jeor calculation
  // BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + s
  // s = +5 for male, -161 for female
  const s = input.gender === 'male' ? 5 : -161
  const bmr = 10 * input.weight + 6.25 * input.height - 5 * input.age + s
  const tdee = Math.round(bmr * input.activityLevel)

  // Calorie and macro target adjustments based on goal
  let targetCalories = tdee
  if (input.goal === 'lose') {
    targetCalories = Math.max(1200, tdee - 500)
  } else if (input.goal === 'gain') {
    targetCalories = tdee + 300
  }

  // Macros calculation:
  // Protein: 2.0g per kg of bodyweight (lose/gain), 1.8g per kg (maintain)
  const proteinFactor = input.goal === 'maintain' ? 1.8 : 2.0
  const targetProtein = Math.round(input.weight * proteinFactor)

  // Fat: 25% of total calories
  // Fat calories = Calories * 0.25. Fat grams = Fat calories / 9
  const targetFat = Math.round((targetCalories * 0.25) / 9)

  // Carbs: remaining calories
  // Carb calories = Total Calories - (Protein * 4) - (Fat * 9)
  // Carb grams = Carb calories / 4
  const proteinCalories = targetProtein * 4
  const fatCalories = targetFat * 9
  const remainingCalories = targetCalories - proteinCalories - fatCalories
  const targetCarbs = Math.max(50, Math.round(remainingCalories / 4))

  // Update target fields in DB
  const { error: updateError } = await supabase
    .from('users')
    .update({
      tdee_target: targetCalories,
      protein_target: targetProtein,
      carbs_target: targetCarbs,
      fat_target: targetFat,
      has_onboarded: true
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/')
  return { success: true, targets: { calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat } }
}

export async function addFoodEntry(data: {
  date: string
  raw_input: string
  parsed_ingredients: any
  calories: number
  protein: number
  carbs: number
  fat: number
  multiplier: number
  saveToSavedFoods?: boolean
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Multiply macro values by serving portion multiplier
  const mult = data.multiplier
  const calories = Math.round(data.calories * mult)
  const protein = Math.round(data.protein * mult * 10) / 10
  const carbs = Math.round(data.carbs * mult * 10) / 10
  const fat = Math.round(data.fat * mult * 10) / 10

  // 1. Find or create the daily log for this user & date
  let { data: log, error: logError } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', data.date)
    .single()

  if (logError && logError.code === 'PGRST116') {
    // Log doesn't exist yet, create it
    const { data: newLog, error: createLogError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: user.id,
        date: data.date,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0
      })
      .select('id')
      .single()

    if (createLogError) {
      return { error: 'Failed to create daily log: ' + createLogError.message }
    }
    log = newLog
  } else if (logError) {
    return { error: logError.message }
  }

  if (!log) {
    return { error: 'Failed to find or create daily log' }
  }

  // 2. Insert the food entry
  const { error: insertError } = await supabase
    .from('food_entries')
    .insert({
      log_id: log.id,
      raw_input: data.raw_input + (mult !== 1 ? ` (${mult}x portion)` : ''),
      parsed_ingredients: data.parsed_ingredients,
      calories,
      protein,
      carbs,
      fat
    })

  if (insertError) {
    return { error: insertError.message }
  }

  // 3. Optional: save to personal database (saved_foods)
  if (data.saveToSavedFoods) {
    const { error: saveError } = await supabase
      .from('saved_foods')
      .insert({
        user_id: user.id,
        food_name: data.raw_input,
        base_serving_description: `${mult}x serving`,
        calories: data.calories, // save base values
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat
      })
    
    if (saveError) {
      console.error('Failed to save to personal library:', saveError.message)
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteFoodEntry(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('food_entries')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function toggleUserRole(role: 'free' | 'pro') {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function saveToMyFoods(data: {
  food_name: string
  base_serving_description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('saved_foods')
    .insert({
      user_id: user.id,
      food_name: data.food_name,
      base_serving_description: data.base_serving_description,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
