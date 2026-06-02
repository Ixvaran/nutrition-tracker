'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Activity, Plus, Trash2, Search, Brain, Key, Sun, Moon,
  RefreshCw, LogOut, Check, Sparkles, User, Database, Dumbbell, AlertTriangle, 
  Home, Sliders, FileText, Settings, Heart, Flame, Footprints, Droplets
} from 'lucide-react'
import { 
  recalculateMacros, addFoodEntry, deleteFoodEntry, 
  saveToMyFoods, toggleUserRole, signOutAction 
} from '@/app/actions'
import { type AIExtractionResponse } from '@/lib/schemas'

interface Profile {
  id: string
  role: 'free' | 'pro'
  username?: string
  has_onboarded: boolean
  daily_ai_requests: number
  last_request_date: string
  tdee_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

interface FoodEntry {
  id: string
  raw_input: string
  parsed_ingredients: any[]
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface SavedFood {
  id: string
  food_name: string
  base_serving_description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface DashboardProps {
  profile: Profile
  dailyLog: {
    id?: string
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    tokens_used: number
  } | null
  foodEntries: FoodEntry[]
  savedFoods: SavedFood[]
  selectedDate: string
  weeklyLogs?: {
    date: string
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
  }[]
}

export default function Dashboard({ 
  profile, 
  dailyLog, 
  foodEntries, 
  savedFoods, 
  selectedDate,
  weeklyLogs = []
}: DashboardProps) {
  const router = useRouter()
  
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // State variables
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SavedFood[]>([])
  const [selectedSavedFood, setSelectedSavedFood] = useState<SavedFood | null>(null)
  const [portionMultiplier, setPortionMultiplier] = useState(1.0)
  
  // Modals / Panels
  const [showRecalculate, setShowRecalculate] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  
  // LocalStorage Custom DeepSeek Key
  const [customApiKey, setCustomApiKey] = useState('')
  
  // AI query states
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<(AIExtractionResponse & { tokens_spent?: number }) | null>(null)
  const [aiSaveToLib, setAiSaveToLib] = useState(true)
  const [aiError, setAiError] = useState<string | null>(null)
  const [revisionPrompt, setRevisionPrompt] = useState('')
  const [aiRevising, setAiRevising] = useState(false)
  
  // Form states configured as strings to prevent leading zeros in UI
  const [recalcForm, setRecalcForm] = useState({
    gender: 'male',
    weight: '70',
    height: '170',
    age: '25',
    activityLevel: 1.375,
    goal: 'maintain'
  })
  
  const [manualForm, setManualForm] = useState({
    food_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    saveToDatabase: false
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Load API Key and Theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('deepseek_api_key') || ''
      setCustomApiKey(key)

      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
      setTheme(savedTheme)
    }
  }, [])

  // Apply theme class to document element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  // Save API Key to localStorage
  const handleSaveApiKey = async (key: string) => {
    localStorage.setItem('deepseek_api_key', key)
    setCustomApiKey(key)
    setShowApiKeyModal(false)
    setStatusMessage({ type: 'success', text: 'Kunci API berhasil disimpan secara lokal.' })

    // Automatically toggle user role to PRO if they saved a key while on FREE tier
    if (profile.role === 'free' && key.trim() !== '') {
      setIsSubmitting(true)
      const res = await toggleUserRole('pro')
      setIsSubmitting(false)
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error })
      } else {
        setStatusMessage({ type: 'success', text: 'Kunci API disimpan dan Anda berhasil beralih ke paket PRO!' })
        router.refresh()
      }
    }
  }

  // Toggle theme action
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', nextTheme)
    setTheme(nextTheme)
  }

  // Handle autocomplete search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([])
      return
    }
    const filtered = savedFoods.filter(food => 
      food.food_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setSearchResults(filtered)
  }, [searchTerm, savedFoods])

  // Handle macro calculations submission
  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMessage(null)
    
    const res = await recalculateMacros({
      gender: recalcForm.gender as 'male' | 'female',
      weight: Number(recalcForm.weight || 0),
      height: Number(recalcForm.height || 0),
      age: Number(recalcForm.age || 0),
      activityLevel: Number(recalcForm.activityLevel),
      goal: recalcForm.goal as 'lose' | 'maintain' | 'gain'
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: 'Kalkulasi target energi dan nutrisi berhasil disimpan!' })
      setShowRecalculate(false)
      router.refresh()
    }
  }

  // Handle adding portion-multiplied saved food
  const handleAddSavedFood = async () => {
    if (!selectedSavedFood) return
    setIsSubmitting(true)
    
    const res = await addFoodEntry({
      date: selectedDate,
      raw_input: selectedSavedFood.food_name,
      parsed_ingredients: [{
        ingredient_name: selectedSavedFood.food_name,
        estimated_grams: 0,
        calories: selectedSavedFood.calories,
        protein: selectedSavedFood.protein,
        carbs: selectedSavedFood.carbs,
        fat: selectedSavedFood.fat
      }],
      calories: selectedSavedFood.calories,
      protein: selectedSavedFood.protein,
      carbs: selectedSavedFood.carbs,
      fat: selectedSavedFood.fat,
      multiplier: portionMultiplier,
      saveToSavedFoods: false
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: `Telah mencatat ${selectedSavedFood.food_name} (${portionMultiplier}x porsi)` })
      setSearchTerm('')
      setSelectedSavedFood(null)
      setPortionMultiplier(1.0)
      router.refresh()
    }
  }

  // Handle manual food insertion
  const handleManualInsert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.food_name) return
    setIsSubmitting(true)
    
    const res = await addFoodEntry({
      date: selectedDate,
      raw_input: manualForm.food_name,
      parsed_ingredients: [{
        ingredient_name: manualForm.food_name,
        estimated_grams: 0,
        calories: Number(manualForm.calories || 0),
        protein: Number(manualForm.protein || 0),
        carbs: Number(manualForm.carbs || 0),
        fat: Number(manualForm.fat || 0)
      }],
      calories: Number(manualForm.calories || 0),
      protein: Number(manualForm.protein || 0),
      carbs: Number(manualForm.carbs || 0),
      fat: Number(manualForm.fat || 0),
      multiplier: 1,
      saveToSavedFoods: manualForm.saveToDatabase
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: `Telah mencatat "${manualForm.food_name}" ke buku harian` })
      setManualForm({
        food_name: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        saveToDatabase: false
      })
      setShowManualAdd(false)
      router.refresh()
    }
  }

  // Helper to update specific ingredient values inline
  const updateIngredientField = (index: number, field: string, value: any) => {
    if (!aiResult) return
    const updatedIngredients = [...aiResult.parsed_ingredients]
    
    let typedValue = value
    if (field !== 'ingredient_name') {
      typedValue = value === '' ? 0 : parseFloat(value)
      if (isNaN(typedValue)) typedValue = 0
    }
    
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: typedValue
    }
    
    // Auto-calculate calories for this row if protein, carbs, or fat changed
    if (field === 'protein' || field === 'carbs' || field === 'fat') {
      const p = field === 'protein' ? typedValue : (updatedIngredients[index].protein || 0)
      const c = field === 'carbs' ? typedValue : (updatedIngredients[index].carbs || 0)
      const f = field === 'fat' ? typedValue : (updatedIngredients[index].fat || 0)
      updatedIngredients[index].calories = Math.round(p * 4 + c * 4 + f * 9)
    }
    
    // Calculate new totals
    const total_calories = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.calories) || 0), 0))
    const total_protein = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.protein) || 0), 0) * 10) / 10
    const total_carbs = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.carbs) || 0), 0) * 10) / 10
    const total_fat = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.fat) || 0), 0) * 10) / 10
    
    setAiResult({
      ...aiResult,
      parsed_ingredients: updatedIngredients,
      total_calories,
      total_protein,
      total_carbs,
      total_fat
    })
  }

  // Helper to delete an ingredient row inline
  const deleteIngredient = (index: number) => {
    if (!aiResult) return
    const updatedIngredients = aiResult.parsed_ingredients.filter((_, i) => i !== index)
    
    const total_calories = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.calories) || 0), 0))
    const total_protein = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.protein) || 0), 0) * 10) / 10
    const total_carbs = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.carbs) || 0), 0) * 10) / 10
    const total_fat = Math.round(updatedIngredients.reduce((sum, ing) => sum + (Number(ing.fat) || 0), 0) * 10) / 10
    
    setAiResult({
      ...aiResult,
      parsed_ingredients: updatedIngredients,
      total_calories,
      total_protein,
      total_carbs,
      total_fat
    })
  }

  // Helper to add a new empty ingredient row inline
  const addIngredient = () => {
    if (!aiResult) return
    const newIngredient = {
      ingredient_name: 'Bahan Baru',
      estimated_grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    }
    const updatedIngredients = [...aiResult.parsed_ingredients, newIngredient]
    
    setAiResult({
      ...aiResult,
      parsed_ingredients: updatedIngredients
    })
  }

  // Handle automatic analysis revision via API
  const handleAiRevision = async () => {
    if (!revisionPrompt.trim() || !aiResult) return
    setAiRevising(true)
    setAiError(null)
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (profile.role === 'pro') {
        if (!customApiKey) {
          setAiRevising(false)
          setShowApiKeyModal(true)
          setAiError('Anda menggunakan Pro Tier (Kunci Mandiri). Silakan masukkan Kunci API Anda terlebih dahulu.')
          return
        }
        headers['x-api-key'] = customApiKey
      }

      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query: searchTerm, // original query
          currentResult: {
            food_name: aiResult.food_name,
            parsed_ingredients: aiResult.parsed_ingredients,
            total_calories: aiResult.total_calories,
            total_protein: aiResult.total_protein,
            total_carbs: aiResult.total_carbs,
            total_fat: aiResult.total_fat
          },
          revisionPrompt: revisionPrompt
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal merevisi hasil analisis.')
      }

      setAiResult(data)
      setRevisionPrompt('')
    } catch (err: any) {
      setAiError(err.message || 'Terjadi kesalahan saat menghubungkan ke asisten untuk revisi.')
    } finally {
      setAiRevising(false)
    }
  }

  // Handle automatic analysis via API
  const handleAiExtract = async () => {
    if (!searchTerm.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (profile.role === 'pro') {
        if (!customApiKey) {
          setAiLoading(false)
          setShowApiKeyModal(true)
          setAiError('Anda menggunakan Pro Tier (Kunci Mandiri). Silakan masukkan Kunci API Anda terlebih dahulu.')
          return
        }
        headers['x-api-key'] = customApiKey
      }

      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: searchTerm })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menganalisis menu makanan Anda.')
      }

      setAiResult(data)
    } catch (err: any) {
      setAiError(err.message || 'Terjadi kesalahan saat menghubungkan ke asisten analisis.')
    } finally {
      setAiLoading(false)
    }
  }

  // Save parsed food into daily logs
  const handleSaveAiResult = async () => {
    if (!aiResult) return
    setIsSubmitting(true)

    const res = await addFoodEntry({
      date: selectedDate,
      raw_input: aiResult.food_name,
      parsed_ingredients: aiResult.parsed_ingredients,
      calories: aiResult.total_calories,
      protein: aiResult.total_protein,
      carbs: aiResult.total_carbs,
      fat: aiResult.total_fat,
      multiplier: 1,
      saveToSavedFoods: aiSaveToLib
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: `Telah mencatat "${aiResult.food_name}" ke buku harian` })
      setAiResult(null)
      setSearchTerm('')
      router.refresh()
    }
  }

  // Deleting logged entry
  const handleDeleteEntry = async (entryId: string) => {
    const res = await deleteFoodEntry(entryId)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: 'Catatan makanan berhasil dihapus' })
      router.refresh()
    }
  }

  // Role Toggler
  const handleToggleRole = async () => {
    if (profile.role === 'free') {
      // If no custom API key exists, force the user to input their own key first to activate PRO
      const storedKey = localStorage.getItem('deepseek_api_key') || ''
      if (!storedKey.trim()) {
        setStatusMessage({ type: 'info', text: 'Masukkan Kunci API Anda sendiri terlebih dahulu untuk beralih ke paket PRO.' })
        setShowApiKeyModal(true)
        return
      }

      setIsSubmitting(true)
      const res = await toggleUserRole('pro')
      setIsSubmitting(false)
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error })
      } else {
        setStatusMessage({ type: 'success', text: 'Berhasil beralih ke paket PRO!' })
        router.refresh()
      }
    } else {
      // Switch back to FREE tier
      setIsSubmitting(true)
      const res = await toggleUserRole('free')
      setIsSubmitting(false)
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error })
      } else {
        setStatusMessage({ type: 'success', text: 'Berhasil beralih ke paket GRATIS (FREE)' })
        router.refresh()
      }
    }
  }

  // Calculate totals and limits
  const loggedCal = dailyLog?.total_calories || 0
  const loggedProtein = dailyLog?.total_protein || 0
  const loggedCarbs = dailyLog?.total_carbs || 0
  const loggedFat = dailyLog?.total_fat || 0

  const targetCal = profile.tdee_target || 2000
  const targetProtein = profile.protein_target || 150
  const targetCarbs = profile.carbs_target || 200
  const targetFat = profile.fat_target || 65

  const calPercentage = Math.min(100, Math.round((loggedCal / targetCal) * 100))
  const proteinPercentage = Math.min(100, Math.round((loggedProtein / targetProtein) * 100))
  const carbsPercentage = Math.min(100, Math.round((loggedCarbs / targetCarbs) * 100))
  const fatPercentage = Math.min(100, Math.round((loggedFat / targetFat) * 105))

  // Generate past 7 days logs ending at selectedDate
  const getWeeklyData = () => {
    const data = []
    const baseDate = new Date(selectedDate)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      const dbLog = weeklyLogs.find(log => log.date === dateStr)
      data.push({
        date: dateStr,
        dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        calories: dbLog ? Number(dbLog.total_calories) : 0,
        protein: dbLog ? Number(dbLog.total_protein) : 0,
        carbs: dbLog ? Number(dbLog.total_carbs) : 0,
        fat: dbLog ? Number(dbLog.total_fat) : 0,
      })
    }
    return data
  }
  const weeklyData = getWeeklyData()
  
  // Calculate weekly averages
  const activeDays = weeklyData.filter(d => d.calories > 0).length
  const totalCaloriesThisWeek = weeklyData.reduce((sum, d) => sum + d.calories, 0)
  const avgCalories = activeDays > 0 ? Math.round(totalCaloriesThisWeek / activeDays) : 0
  const avgProtein = activeDays > 0 ? Math.round(weeklyData.reduce((sum, d) => sum + d.protein, 0) / activeDays * 10) / 10 : 0
  const avgCarbs = activeDays > 0 ? Math.round(weeklyData.reduce((sum, d) => sum + d.carbs, 0) / activeDays * 10) / 10 : 0
  const avgFat = activeDays > 0 ? Math.round(weeklyData.reduce((sum, d) => sum + d.fat, 0) / activeDays * 10) / 10 : 0

  // ==========================================
  // WIZARD ONBOARDING: First-time user setup
  // ==========================================
  if (!profile.has_onboarded) {
    return (
      <div className="min-h-screen bg-radial from-slate-100 via-slate-200 to-slate-300 text-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white border border-slate-350 p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-lime-400/20 text-lime-650 flex items-center justify-center border border-lime-400/40 mb-4">
              <Dumbbell className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Halo! Mari Atur Target Tubuhmu
            </h2>
            <p className="text-xs text-slate-700 mt-2 max-w-sm leading-relaxed font-semibold">
              Sebelum mencatat makanan, kami perlu sedikit info tubuh Anda untuk menghitung kebutuhan energi harian secara otomatis.
            </p>
          </div>

          <form onSubmit={handleRecalculate} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
              <select 
                value={recalcForm.gender}
                onChange={(e) => setRecalcForm({...recalcForm, gender: e.target.value})}
                className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Berat (kg)</label>
                <input 
                  type="number" 
                  required
                  placeholder="70"
                  min="30"
                  max="300"
                  value={recalcForm.weight}
                  onChange={(e) => setRecalcForm({...recalcForm, weight: e.target.value})}
                  className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Tinggi (cm)</label>
                <input 
                  type="number" 
                  required
                  placeholder="170"
                  min="100"
                  max="250"
                  value={recalcForm.height}
                  onChange={(e) => setRecalcForm({...recalcForm, height: e.target.value})}
                  className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Umur (tahun)</label>
                <input 
                  type="number" 
                  required
                  placeholder="25"
                  min="10"
                  max="120"
                  value={recalcForm.age}
                  onChange={(e) => setRecalcForm({...recalcForm, age: e.target.value})}
                  className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Tingkat Aktivitas Harian</label>
              <select 
                value={recalcForm.activityLevel}
                onChange={(e) => setRecalcForm({...recalcForm, activityLevel: Number(e.target.value)})}
                className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
              >
                <option value={1.2}>Sangat Jarang Olahraga (Kerja kantoran di meja)</option>
                <option value={1.375}>Olahraga Ringan (Olahraga 1-3 hari/minggu)</option>
                <option value={1.55}>Aktif Sedang (Olahraga teratur 3-5 hari/minggu)</option>
                <option value={1.725}>Sangat Aktif (Olahraga harian 6-7 hari/minggu)</option>
                <option value={1.9}>Atlet / Pekerja Fisik Berat (Kerja fisik berat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Target Kebugaran</label>
              <select 
                value={recalcForm.goal}
                onChange={(e) => setRecalcForm({...recalcForm, goal: e.target.value})}
                className="w-full bg-white border border-slate-400 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-lime-550 transition-colors shadow-xs"
              >
                <option value="lose">Menurunkan Berat Badan (-500 kalori)</option>
                <option value="maintain">Menjaga Berat Badan (Kalori seimbang)</option>
                <option value="gain">Meningkatkan Massa Otot (+300 kalori)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-lime-400 hover:bg-lime-500 disabled:opacity-50 text-black font-extrabold py-4 rounded-2xl text-sm transition-all cursor-pointer shadow-lg shadow-lime-950/10 mt-4"
            >
              {isSubmitting ? 'Menghitung Target...' : 'Hitung Target Kebutuhan Kalori'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // NORMAL OVERHAULED DASHBOARD VIEW
  // ==========================================
  const isLight = theme === 'light'
  
  return (
    <div className={`min-h-screen transition-colors duration-300 pb-32 font-sans ${
      isLight ? 'bg-[#f4f7f2] text-slate-900' : 'bg-[#0b0f17] text-slate-100'
    }`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
        isLight ? 'border-slate-400 bg-white/90' : 'border-slate-900 bg-[#0e1320]/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all ${
              isLight ? 'bg-lime-400/10 text-lime-650 border-lime-400/40' : 'bg-lime-400/20 text-lime-400 border-lime-400/30'
            }`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-lime-550 to-teal-500">
                NutriFit
              </h1>
              <p className={`text-[10px] uppercase font-bold tracking-widest ${
                isLight ? 'text-slate-750' : 'text-slate-550'
              }`}>Buku Harian Kesehatan Makanan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
            {profile.username && (
              <div className={`flex items-center space-x-2.5 border rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                isLight ? 'bg-white border-slate-400 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                <User className="h-3.5 w-3.5 text-lime-500" />
                <span>Hai, {profile.username}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700" />
                <button
                  onClick={handleToggleRole}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border cursor-pointer hover:opacity-90 active:scale-95 transition-all ${
                    profile.role === 'pro'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-450 border-slate-300 dark:border-slate-700'
                  }`}
                  title="Klik untuk beralih antara Gratis dan Pro"
                >
                  {profile.role}
                </button>
              </div>
            )}

            {/* Quick date display/selector */}
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => router.push(`/?date=${e.target.value}`)}
              className={`border rounded-2xl px-4 py-2 text-xs font-bold focus:outline-hidden transition-all shadow-xs ${
                isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-555' : 'bg-slate-900 border-slate-800 text-slate-300 focus:border-lime-500'
              }`}
            />

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                isLight ? 'bg-white border-slate-400 text-slate-800 hover:bg-slate-100 hover:text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title={isLight ? 'Ganti ke Mode Malam' : 'Ganti ke Mode Terang'}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <button
              onClick={() => signOutAction()}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                isLight ? 'bg-white border-slate-400 text-slate-800 hover:text-rose-650 hover:border-rose-400 hover:bg-rose-50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-950'
              }`}
              title="Keluar Akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Status Alerts */}
        {statusMessage && (
          <div className={`col-span-12 p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : statusMessage.type === 'info'
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455'
          }`}>
            <span className="text-sm font-semibold">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100 font-bold px-2">✕</button>
          </div>
        )}        {/* HERO DASHBOARD SECTION */}
        <div className="col-span-12">
          <div className={`rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden shadow-xl border-2 ${
            isLight 
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-lime-50/80 border-slate-300 text-slate-900' 
              : 'bg-gradient-to-br from-[#0a1b15] via-[#09151e] to-[#0e1610] border-slate-900 text-slate-100'
          }`}>
            {/* Background elements */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left Column: Greeting and Motivation */}
              <div className="lg:col-span-4 space-y-4">
                <div className="inline-flex items-center space-x-2 bg-lime-400/20 text-lime-700 dark:text-lime-400 px-3 py-1.5 rounded-full text-xs font-bold border border-lime-400/30">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>Kebugaran Harian</span>
                </div>
                
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">
                    Halo, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-lime-500">{profile.username || 'Pengguna'}</span>!
                  </h2>
                  <p className={`text-sm mt-2 leading-relaxed font-semibold ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                    {calPercentage === 0 
                      ? "Hari baru, semangat baru! Ayo catat makanan pertamamu hari ini untuk memantau asupan nutrisi harian." 
                      : calPercentage < 50 
                      ? "Awal yang baik! Teruskan mencatat asupan makananmu hari ini untuk mencapai target ideal tubuh."
                      : calPercentage < 100 
                      ? "Hebat! Kamu sudah hampir mencapai target kalorimu hari ini. Sedikit lagi!"
                      : "Luar biasa! Target kalori harianmu telah tercapai. Jaga terus keseimbangan nutrisimu!"}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button 
                    onClick={() => setShowRecalculate(true)}
                    className={`text-xs font-bold border px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-xs ${
                      isLight ? 'bg-white border-slate-450 hover:bg-slate-100 text-slate-800' : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    Ubah Target Profil
                  </button>
                  <div className={`text-xs font-bold px-4 py-2.5 rounded-2xl border flex items-center ${
                    isLight ? 'bg-white border-slate-400 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}>
                    <span>Target: {targetCal} kkal</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Calories Circular/Slider Indicator */}
              <div className="lg:col-span-4">
                <div className={`rounded-3xl p-5 border flex flex-col justify-between h-full relative overflow-hidden backdrop-blur-md ${
                  isLight ? 'bg-white/85 border-slate-350 shadow-xs' : 'bg-slate-955/40 border-slate-900/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-lime-700 dark:text-lime-400">Pencapaian Kalori</span>
                    <span className="text-xs font-bold bg-lime-400/20 px-2 py-0.5 rounded-full text-lime-700 dark:text-lime-400 border border-lime-450/20">
                      {calPercentage}%
                    </span>
                  </div>

                  <div className="my-6">
                    <div className="text-4xl font-black tracking-tight">{loggedCal} <span className="text-lg font-medium text-slate-500">kkal</span></div>
                    <div className={`text-xs font-semibold mt-1 ${isLight ? 'text-slate-850' : 'text-slate-400'}`}>
                      tersisa {Math.max(0, targetCal - loggedCal)} kkal dari target {targetCal} kkal
                    </div>
                  </div>

                  {/* Progress bar with outline knob */}
                  <div className="relative pt-1.5">
                    <div className={`h-3.5 bg-slate-200 dark:bg-slate-955 border rounded-full overflow-hidden ${
                      isLight ? 'border-slate-400' : 'border-slate-850'
                    }`}>
                      <div 
                        className="bg-lime-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${calPercentage}%` }}
                      />
                    </div>
                    {calPercentage > 0 && calPercentage < 100 && (
                      <div 
                        className="absolute top-[2px] w-5 h-5 bg-white border-2 border-black rounded-full -translate-x-1/2 shadow-md transition-all duration-500 flex items-center justify-center cursor-pointer"
                        style={{ left: `${calPercentage}%` }}
                      >
                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Macronutrients Dashboard */}
              <div className="lg:col-span-4 space-y-3.5">
                
                {/* Protein */}
                <div className={`p-3.5 rounded-2xl border transition-colors backdrop-blur-md ${
                  isLight ? 'bg-white/85 border-slate-350' : 'bg-slate-955/40 border-slate-900/60'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="flex items-center text-rose-650 dark:text-rose-455">
                      <Flame className="h-4 w-4 mr-1.5 shrink-0" />
                      Protein
                    </span>
                    <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                      {loggedProtein}g <span className={`font-normal ${isLight ? 'text-slate-700' : 'opacity-65'}`}>/ {targetProtein}g</span> ({proteinPercentage}%)
                    </span>
                  </div>
                  <div className={`h-2.5 bg-slate-200 dark:bg-slate-955 border rounded-full overflow-hidden ${
                    isLight ? 'border-slate-400' : 'border-slate-850'
                  }`}>
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${proteinPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div className={`p-3.5 rounded-2xl border transition-colors backdrop-blur-md ${
                  isLight ? 'bg-white/85 border-slate-350' : 'bg-slate-955/40 border-slate-900/60'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="flex items-center text-amber-600 dark:text-amber-400">
                      <Footprints className="h-4 w-4 mr-1.5 shrink-0" />
                      Karbohidrat
                    </span>
                    <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                      {loggedCarbs}g <span className={`font-normal ${isLight ? 'text-slate-700' : 'opacity-65'}`}>/ {targetCarbs}g</span> ({carbsPercentage}%)
                    </span>
                  </div>
                  <div className={`h-2.5 bg-slate-200 dark:bg-slate-955 border rounded-full overflow-hidden ${
                    isLight ? 'border-slate-400' : 'border-slate-850'
                  }`}>
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${carbsPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div className={`p-3.5 rounded-2xl border transition-colors backdrop-blur-md ${
                  isLight ? 'bg-white/85 border-slate-350' : 'bg-slate-955/40 border-slate-900/60'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="flex items-center text-sky-600 dark:text-sky-400">
                      <Droplets className="h-4 w-4 mr-1.5 shrink-0" />
                      Lemak
                    </span>
                    <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                      {loggedFat}g <span className={`font-normal ${isLight ? 'text-slate-700' : 'opacity-65'}`}>/ {targetFat}g</span> ({fatPercentage}%)
                    </span>
                  </div>
                  <div className={`h-2.5 bg-slate-200 dark:bg-slate-955 border rounded-full overflow-hidden ${
                    isLight ? 'border-slate-400' : 'border-slate-855'
                  }`}>
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${fatPercentage}%` }}
                    />
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* PROMINENT DAILY TOKEN USAGE INDICATOR CARD */}
        <div className="col-span-12">
          <div className={`rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden shadow-xs border-2 ${
            isLight 
              ? 'bg-lime-400/10 border-lime-550/60 text-slate-900' 
              : 'bg-[#18251e] border-emerald-950/60 text-slate-100'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                  isLight ? 'bg-lime-400/20 border-lime-550/50 text-lime-750' : 'bg-lime-400/30 border-lime-400/40 text-lime-400'
                }`}>
                  <Brain className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-md font-black">Informasi Penggunaan Token Harian</h3>
                  <p className={`text-xs mt-0.5 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                    Kuota API digunakan untuk menganalisis menu makanan Anda secara otomatis.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className={`border-b sm:border-b-0 sm:border-r pb-4 sm:pb-0 pr-0 sm:pr-6 ${isLight ? 'border-slate-400' : 'border-slate-850'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Token Terpakai Hari Ini</span>
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-lime-500 font-mono mt-0.5">
                    {dailyLog?.tokens_used || 0} <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>token</span>
                  </div>
                </div>

                <div className={`border-b sm:border-b-0 sm:border-r pb-4 sm:pb-0 pr-0 sm:pr-6 ${isLight ? 'border-slate-400' : 'border-slate-850'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    {profile.role === 'free' ? 'Batas Analisis Gratis' : 'Status Akun'}
                  </span>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {profile.role === 'free' ? (
                      <>
                        {profile.daily_ai_requests} <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>/ 1 kali</span>
                      </>
                    ) : (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent font-black">PRO TIER</span>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleToggleRole}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                      profile.role === 'free'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border border-amber-500 hover:opacity-90'
                        : 'bg-white/10 dark:bg-slate-900 border border-slate-300 dark:border-slate-850 text-slate-800 dark:text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {profile.role === 'free' ? 'Upgrade ke PRO (Milik Sendiri)' : 'Kembali ke GRATIS'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 1: Progress Indicators (lg: 8) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Logging Component / search and options */}
          <div className={`p-5 sm:p-6 rounded-3xl shadow-xs transition-colors border-2 ${
            isLight ? 'bg-white border-slate-400' : 'bg-[#0f1524] border-slate-900'
          }`}>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {showManualAdd ? 'Catat Makanan secara Manual' : 'Hari ini kamu sudah makan apa saja?'}
                </h3>
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>
                  {showManualAdd ? 'Masukkan rincian gramasi dan nutrisi secara presisi' : 'Tulis menu makanan Anda secara alami untuk dihitung'}
                </p>
              </div>
              <button 
                onClick={() => setShowManualAdd(!showManualAdd)}
                className={`text-xs font-bold border-2 px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs ${
                  isLight ? 'bg-white border-slate-400 hover:bg-slate-100 text-slate-800' : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
                }`}
              >
                {showManualAdd ? (
                  <>
                    <Brain className="h-3.5 w-3.5 text-lime-500" />
                    <span>Mode Analisis AI</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-lime-500" />
                    <span>Input Manual</span>
                  </>
                )}
              </button>
            </div>

            {showManualAdd ? (
              /* Manual Input Form */
              <form onSubmit={handleManualInsert} className={`p-5 rounded-2xl border-2 ${
                isLight ? 'bg-slate-50/50 border-slate-400' : 'bg-slate-950/40 border-slate-900'
              } space-y-4`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-850' : 'text-slate-400'}`}>Input Manual Detail Makanan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Nama Makanan</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Nasi Padang Lauk Rendang"
                      value={manualForm.food_name}
                      onChange={(e) => setManualForm({...manualForm, food_name: e.target.value})}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                        isLight ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' : 'bg-slate-900 border-slate-855 text-slate-200 focus:border-lime-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Kalori (kkal)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={manualForm.calories}
                      onChange={(e) => setManualForm({...manualForm, calories: e.target.value})}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                        isLight ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' : 'bg-slate-900 border-slate-855 text-slate-200 focus:border-lime-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Protein (gram)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      step="0.1"
                      value={manualForm.protein}
                      onChange={(e) => setManualForm({...manualForm, protein: e.target.value})}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                        isLight ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' : 'bg-slate-900 border-slate-855 text-slate-200 focus:border-lime-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Karbohidrat (gram)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      step="0.1"
                      value={manualForm.carbs}
                      onChange={(e) => setManualForm({...manualForm, carbs: e.target.value})}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                        isLight ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' : 'bg-slate-900 border-slate-855 text-slate-200 focus:border-lime-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Lemak (gram)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      step="0.1"
                      value={manualForm.fat}
                      onChange={(e) => setManualForm({...manualForm, fat: e.target.value})}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                        isLight ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' : 'bg-slate-900 border-slate-855 text-slate-200 focus:border-lime-500'
                      }`}
                    />
                  </div>
                </div>                <div className="flex items-center space-x-2 py-2">
                  <input 
                    type="checkbox" 
                    id="saveToDatabase" 
                    checked={manualForm.saveToDatabase}
                    onChange={(e) => setManualForm({...manualForm, saveToDatabase: e.target.checked})}
                    className={`rounded bg-slate-100 text-lime-550 focus:ring-0 cursor-pointer ${
                      isLight ? 'border-slate-400' : 'border-slate-800'
                    }`}
                  />
                  <label htmlFor="saveToDatabase" className={`text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                    Simpan ke daftar favorit Anda
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-lime-400 hover:bg-lime-500 disabled:opacity-50 text-black font-extrabold py-3.5 rounded-2xl transition-all cursor-pointer text-sm shadow-md"
                >
                  {isSubmitting ? 'Mencatat...' : 'Catat Makanan Baru'}
                </button>
              </form>
            ) : (
              /* Search / Ask Assistant Input area */
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Tulis makananmu... (misal: '1 mangkok oatmeal + susu + pisang')"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAiExtract()
                      }
                    }}
                    className={`w-full border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-hidden transition-all shadow-xs ${
                      isLight 
                        ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-600 focus:border-lime-550' 
                        : 'bg-slate-955 border-slate-855 text-slate-200 placeholder-slate-400 focus:border-lime-500'
                    }`}
                  />
                </div>

                {/* Hybrid Autocomplete Search Results */}
                {searchResults.length > 0 && (
                  <div className={`border-2 rounded-2xl p-2 max-h-60 overflow-y-auto divide-y shadow-lg ${
                    isLight ? 'bg-white border-slate-400 divide-slate-300' : 'bg-slate-900 border-slate-800 divide-slate-850'
                  }`}>
                    <div className={`px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center ${isLight ? 'text-slate-850' : 'text-slate-450'}`}>
                      <Database className="h-3.5 w-3.5 mr-1.5 text-lime-555" />
                      Daftar makanan favorit tersimpan
                    </div>
                    {searchResults.map((food) => (
                      <button 
                        key={food.id}
                        onClick={() => setSelectedSavedFood(food)}
                        className={`w-full text-left px-3.5 py-3 hover:bg-lime-400/5 transition-colors flex justify-between items-center text-sm cursor-pointer border-b last:border-b-0 ${
                          isLight ? 'border-slate-300 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-850/20'
                        }`}
                      >
                        <div>
                          <span className={`font-extrabold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{food.food_name}</span>
                          <span className={`text-xs ml-2 ${isLight ? 'text-slate-750' : 'text-slate-505'}`}>({food.base_serving_description})</span>
                        </div>
                        <div className={`text-xs font-bold font-mono ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>
                          {food.calories} kkal • P:{food.protein}g K:{food.carbs}g L:{food.fat}g
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected food portion adjuster */}
                {selectedSavedFood && (
                  <div className={`border p-5 rounded-2xl space-y-4 ${
                    isLight ? 'bg-lime-400/5 border-lime-550/55' : 'bg-lime-400/5 border-lime-400/20'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-lime-650 dark:text-lime-400">Makanan Favorit Ditemukan!</h4>
                        <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-800' : 'text-slate-405'}`}>
                          Terpilih: <span className={`font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedSavedFood.food_name}</span> ({selectedSavedFood.base_serving_description})
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedSavedFood(null)} 
                        className={`text-xs font-bold ${isLight ? 'text-slate-750 hover:text-slate-950' : 'text-slate-400 hover:text-slate-300'}`}
                      >
                        Batal
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-850' : 'text-slate-455'}`}>Sesuaikan Porsi Konsumsi</label>
                        <div className="flex items-center space-x-3.5">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3.0" 
                            step="0.1" 
                            value={portionMultiplier}
                            onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                            className="flex-1 accent-lime-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0.01"
                            value={portionMultiplier}
                            onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                            className={`border rounded-lg px-2 py-1 text-xs text-center w-16 focus:outline-hidden font-bold ${
                              isLight ? 'bg-white border-slate-400 text-slate-900 shadow-sm' : 'bg-slate-900 border-slate-800 text-slate-200'
                            }`}
                          />
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-850' : 'text-slate-400'}`}>x porsi</span>
                        </div>
                      </div>
                    </div>

                    {/* Portioned calculations preview */}
                    <div className={`border-2 rounded-xl p-3 text-xs flex justify-around font-semibold ${
                      isLight ? 'bg-white border-slate-400' : 'bg-slate-955/80 border-slate-900'
                    }`}>
                      <div>Kalori: <span className={`font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{Math.round(selectedSavedFood.calories * portionMultiplier)} kkal</span></div>
                      <div>P: <span className="font-bold text-rose-500">{Math.round(selectedSavedFood.protein * portionMultiplier * 10) / 10}g</span></div>
                      <div>K: <span className="font-bold text-amber-500">{Math.round(selectedSavedFood.carbs * portionMultiplier * 10) / 10}g</span></div>
                      <div>L: <span className="font-bold text-sky-500">{Math.round(selectedSavedFood.fat * portionMultiplier * 10) / 10}g</span></div>
                    </div>

                    <button 
                      onClick={handleAddSavedFood}
                      disabled={isSubmitting}
                      className="w-full bg-lime-400 hover:bg-lime-550 disabled:opacity-50 text-black font-extrabold py-3 rounded-xl text-xs tracking-wide transition-colors cursor-pointer shadow-sm"
                    >
                      {isSubmitting ? 'Mencatat...' : 'Catat dengan Porsi Ini'}
                    </button>
                  </div>
                )}

                {/* AI extract prompt if search term contains content and no favorite matches */}
                {searchTerm.trim() !== '' && !selectedSavedFood && (
                  <div className={`flex items-center justify-between p-4.5 border-2 rounded-2xl transition-all ${
                    isLight ? 'bg-slate-100 border-slate-400' : 'bg-slate-950 border-slate-900'
                  }`}>
                    <div className="flex items-center space-x-3.5 pr-2">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isLight ? 'bg-lime-200 text-lime-800 border border-lime-300' : 'bg-lime-400/20 text-lime-400'}`}>
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Analisis Otomatis Menu</div>
                        <div className={`text-xs mt-0.5 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>
                          {profile.role === 'free' 
                            ? 'Asisten akan memecah menu makanan Anda.' 
                            : 'Gunakan asisten analisis sepuasnya tanpa batas.'}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleAiExtract}
                      disabled={aiLoading}
                      className="bg-lime-400 hover:bg-lime-550 disabled:opacity-50 text-black font-bold text-xs py-2.5 px-4.5 rounded-xl transition-all cursor-pointer flex items-center whitespace-nowrap shadow-md shadow-lime-950/10"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Menganalisis...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                          Mulai Analisis
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Review Panel */}
            {aiError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Gagal Menganalisis: </span>
                  {aiError}
                </div>
              </div>
            )}

            {aiResult && (
              <div className={`p-5 rounded-2xl border-2 mt-4 ${
                isLight ? 'bg-slate-50 border-slate-400' : 'bg-[#0e1320] border-slate-900'
              } space-y-4`}>
                <div className={`flex justify-between items-start border-b pb-3 ${isLight ? 'border-slate-350' : 'border-slate-900'}`}>
                  <div className="flex-1 mr-4">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-lime-700 dark:text-lime-400">Ditemukan Hasil Berikut:</span>
                    <input 
                      type="text"
                      value={aiResult.food_name}
                      onChange={(e) => setAiResult({ ...aiResult, food_name: e.target.value })}
                      className={`text-md font-extrabold mt-1 bg-transparent border-b focus:outline-hidden focus:ring-0 focus:border-lime-500 w-full py-0.5 transition-colors font-sans ${
                        isLight ? 'text-slate-900 border-slate-300' : 'text-white border-slate-800'
                      }`}
                      placeholder="Nama Makanan"
                    />
                  </div>
                  <button 
                    onClick={() => setAiResult(null)} 
                    className={`text-xs font-bold shrink-0 mt-1 ${isLight ? 'text-slate-750 hover:text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Batal
                  </button>
                </div>

                {/* Detected ingredients breakdown */}
                <div className="space-y-2">
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-850' : 'text-slate-455'}`}>Bahan Makanan yang Terdeteksi</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[600px]">
                      <thead>
                        <tr className={`border-b ${isLight ? 'text-slate-850 border-slate-400' : 'text-slate-400 border-slate-900'}`}>
                          <th className="pb-2 font-bold w-[35%]">Bahan</th>
                          <th className="pb-2 font-bold text-right w-[12%]">Berat</th>
                          <th className="pb-2 font-bold text-right w-[12%]">Kalori</th>
                          <th className="pb-2 font-bold text-right w-[10%]">Protein</th>
                          <th className="pb-2 font-bold text-right w-[10%]">Karbo</th>
                          <th className="pb-2 font-bold text-right w-[10%]">Lemak</th>
                          <th className="pb-2 font-bold text-right w-[6%]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-300' : 'divide-slate-900'}`}>
                        {aiResult.parsed_ingredients.map((ing, i) => (
                          <tr key={i} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 pr-2">
                              <input
                                type="text"
                                value={ing.ingredient_name}
                                onChange={(e) => updateIngredientField(i, 'ingredient_name', e.target.value)}
                                className={`w-full bg-transparent px-2 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-bold border transition-all ${
                                  isLight 
                                    ? 'border-slate-300 bg-white text-slate-900 focus:border-slate-400' 
                                    : 'border-slate-855 bg-[#161c2a] text-slate-100 focus:border-slate-700'
                                }`}
                              />
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="1"
                                  value={ing.estimated_grams}
                                  onChange={(e) => updateIngredientField(i, 'estimated_grams', e.target.value)}
                                  className={`w-14 text-right bg-transparent px-1.5 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-mono font-bold border transition-all ${
                                    isLight 
                                      ? 'border-slate-300 bg-white text-slate-900 focus:border-slate-400' 
                                      : 'border-slate-855 bg-[#161c2a] text-slate-100 focus:border-slate-700'
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>g</span>
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="1"
                                  value={ing.calories}
                                  onChange={(e) => updateIngredientField(i, 'calories', e.target.value)}
                                  className={`w-16 text-right bg-transparent px-1.5 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-mono font-bold border transition-all ${
                                    isLight 
                                      ? 'border-slate-300 bg-white text-slate-900 focus:border-slate-400' 
                                      : 'border-slate-855 bg-[#161c2a] text-slate-100 focus:border-slate-700'
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={ing.protein}
                                  onChange={(e) => updateIngredientField(i, 'protein', e.target.value)}
                                  className={`w-12 text-right bg-transparent px-1.5 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-mono font-bold border transition-all ${
                                    isLight 
                                      ? 'border-slate-300 bg-white text-rose-600 focus:border-slate-400' 
                                      : 'border-slate-855 bg-[#161c2a] text-rose-455 focus:border-slate-700'
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>g</span>
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={ing.carbs}
                                  onChange={(e) => updateIngredientField(i, 'carbs', e.target.value)}
                                  className={`w-12 text-right bg-transparent px-1.5 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-mono font-bold border transition-all ${
                                    isLight 
                                      ? 'border-slate-300 bg-white text-amber-600 focus:border-slate-400' 
                                      : 'border-slate-855 bg-[#161c2a] text-amber-500 focus:border-slate-700'
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>g</span>
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={ing.fat}
                                  onChange={(e) => updateIngredientField(i, 'fat', e.target.value)}
                                  className={`w-12 text-right bg-transparent px-1.5 py-1 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-mono font-bold border transition-all ${
                                    isLight 
                                      ? 'border-slate-300 bg-white text-sky-600 focus:border-slate-400' 
                                      : 'border-slate-855 bg-[#161c2a] text-sky-455 focus:border-slate-700'
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>g</span>
                              </div>
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <button
                                onClick={() => deleteIngredient(i)}
                                className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 hover:text-rose-650 transition-colors cursor-pointer"
                                title="Hapus Bahan Makanan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Add Row Button Row */}
                        <tr>
                          <td colSpan={7} className="py-2.5">
                            <button
                              onClick={addIngredient}
                              className={`w-full py-2 px-4 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                isLight 
                                  ? 'border-slate-350 text-slate-800 bg-white hover:bg-slate-100 hover:border-slate-400' 
                                  : 'border-slate-800 text-slate-300 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-750'
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5 text-lime-600" />
                              Tambah Bahan Makanan Baru
                            </button>
                          </td>
                        </tr>

                        {/* Total Nutrisi Row */}
                        <tr className={`font-extrabold text-slate-900 dark:text-white border-t ${isLight ? 'border-slate-350' : 'border-slate-800'}`}>
                          <td className="py-3 text-lime-700 dark:text-lime-450 font-bold">Total Nutrisi</td>
                          <td className="py-3 text-right"></td>
                          <td className="py-3 text-right text-lime-700 dark:text-lime-400 font-mono font-black">{aiResult.total_calories} kkal</td>
                          <td className="py-3 text-right text-rose-500 font-mono font-black">{aiResult.total_protein}g</td>
                          <td className="py-3 text-right text-amber-500 font-mono font-black">{aiResult.total_carbs}g</td>
                          <td className="py-3 text-right text-sky-500 font-mono font-black">{aiResult.total_fat}g</td>
                          <td className="py-3 text-right"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Thoughts and Sources Explanation */}
                {(aiResult.analysis_thoughts || (aiResult.sources && aiResult.sources.length > 0)) && (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 transition-colors ${
                    isLight ? 'bg-lime-50/30 border-lime-400/30' : 'bg-lime-400/5 border-lime-500/10'
                  }`}>
                    {aiResult.analysis_thoughts && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-lime-700 dark:text-lime-450 flex items-center">
                          <Brain className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          Analisis & Pemikiran AI:
                        </span>
                        <p className={`text-xs font-semibold leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          {aiResult.analysis_thoughts}
                        </p>
                      </div>
                    )}
                    
                    {aiResult.sources && aiResult.sources.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-dashed border-lime-400/20 dark:border-lime-500/15">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-lime-700 dark:text-lime-455 flex items-center">
                          <Database className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          Sumber Data Referensi:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {aiResult.sources.map((src, sIdx) => (
                            <span 
                              key={sIdx} 
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                isLight 
                                  ? 'bg-white border-slate-300 text-slate-800 shadow-2xs' 
                                  : 'bg-[#121824] border-slate-800 text-slate-400'
                              }`}
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Revision Prompt Section */}
                <div className={`p-4 rounded-2xl border-2 space-y-2 mt-4 transition-colors ${
                  isLight ? 'bg-slate-100 border-slate-350' : 'bg-slate-900/40 border-slate-900'
                }`}>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-850' : 'text-slate-455'}`}>
                    Revisi atau Koreksi Hasil Analisis AI
                  </label>
                  <p className={`text-[11px] font-semibold leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-455'}`}>
                    Kurang sesuai? Tulis bagian mana yang salah (misal: "susunya diganti non-fat" atau "tambah gula 1 sendok makan") agar AI memperbarui analisisnya.
                  </p>
                  <div className="flex space-x-2.5">
                    <input
                      type="text"
                      value={revisionPrompt}
                      onChange={(e) => setRevisionPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAiRevision()
                        }
                      }}
                      placeholder="Contoh: Susu kental manis diganti susu kedelai..."
                      className={`flex-1 bg-transparent px-3.5 py-2.5 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-lime-500 font-medium border transition-all ${
                        isLight 
                          ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-500' 
                          : 'border-slate-855 bg-[#0a0f1d] text-slate-100 placeholder-slate-600'
                      }`}
                      disabled={aiRevising}
                    />
                    <button
                      onClick={handleAiRevision}
                      disabled={aiRevising || !revisionPrompt.trim()}
                      className="bg-lime-400 hover:bg-lime-550 disabled:opacity-50 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center whitespace-nowrap shadow-md shadow-lime-950/10"
                    >
                      {aiRevising ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Memproses...
                        </>
                      ) : (
                        'Kirim Revisi'
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input 
                    type="checkbox" 
                    id="aiSaveToLib" 
                    checked={aiSaveToLib}
                    onChange={(e) => setAiSaveToLib(e.target.checked)}
                    className={`rounded bg-slate-100 text-lime-550 focus:ring-0 cursor-pointer ${
                      isLight ? 'border-slate-350' : 'border-slate-855'
                    }`}
                  />
                  <label htmlFor="aiSaveToLib" className={`text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-800' : 'text-slate-455'}`}>
                    Simpan makanan ini ke daftar favorit untuk pencarian cepat nanti
                  </label>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={handleSaveAiResult}
                    disabled={isSubmitting}
                    className="flex-1 bg-lime-400 hover:bg-lime-550 disabled:opacity-50 text-black font-extrabold py-3.5 rounded-2xl text-xs tracking-wider transition-colors cursor-pointer shadow-md shadow-lime-950/5"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Masukkan ke Buku Harian'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's Logged Foods List */}
          <div className={`p-5 sm:p-6 rounded-3xl shadow-xs transition-colors space-y-4 border-2 ${
            isLight ? 'bg-white border-slate-400' : 'bg-[#0f1524] border-slate-900'
          }`}>
            <div>
              <h3 className="text-lg font-black tracking-tight">Buku Harian Makanan Anda</h3>
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>Makanan yang dicatat pada {selectedDate}</p>
            </div>

            {foodEntries.length === 0 ? (
              <div className={`text-center py-10 border border-dashed rounded-2xl px-4 ${
                isLight ? 'bg-slate-50/50 border-slate-400' : 'bg-slate-955/40 border-slate-850'
              }`}>
                <Database className={`h-8 w-8 mx-auto mb-2.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`} />
                <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-400'}`}>Belum ada makanan dicatat</p>
                <p className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>Cari atau masukkan menu makanan Anda di atas.</p>
              </div>
            ) : (
              <div className={`divide-y border-2 rounded-2xl overflow-hidden ${
                isLight ? 'bg-slate-50/50 border-slate-400 divide-slate-350' : 'bg-slate-955/40 border-slate-900 divide-slate-900'
              }`}>
                {foodEntries.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-lime-400/5 transition-colors">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-200">{entry.raw_input}</span>
                      <div className={`flex items-center space-x-3 flex-wrap text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>
                        <span className="bg-lime-400/10 text-lime-700 dark:text-lime-455 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          {entry.calories} kkal
                        </span>
                        <span>P: {entry.protein}g</span>
                        <span>K: {entry.carbs}g</span>
                        <span>L: {entry.fat}g</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isLight ? 'text-slate-850 hover:text-rose-650 hover:bg-slate-100' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-900'
                      }`}
                      title="Hapus Makanan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Weekly Recap & Personal Database Library (lg: 4) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* WEEKLY RECAP CARD */}
          <div className={`p-5 sm:p-6 rounded-3xl shadow-xs transition-colors space-y-4 border-2 ${
            isLight ? 'bg-white border-slate-400' : 'bg-[#0f1524] border-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Rekap Mingguan</h3>
                <p className={`text-xs font-medium ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>Analisis nutrisi 7 hari terakhir</p>
              </div>
              <Activity className="h-5 w-5 text-lime-500" />
            </div>

            {/* Average Calories / Metrics */}
            <div className={`grid grid-cols-2 gap-3 p-3 rounded-2xl border-2 ${
              isLight ? 'bg-slate-50/80 border-slate-350' : 'bg-slate-955/40 border-slate-900'
            }`}>
              <div className="text-center py-1">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>Rata-rata Kalori</span>
                <div className="text-lg font-black text-lime-650 dark:text-lime-400 font-mono mt-0.5">{avgCalories} kkal</div>
              </div>
              <div className="text-center py-1 border-l border-dashed border-slate-300 dark:border-slate-800">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>Hari Aktif Catat</span>
                <div className="text-lg font-black font-mono mt-0.5">{activeDays} <span className="text-[10px] font-bold text-slate-500">hari</span></div>
              </div>
            </div>

            {/* Weekly Bar Chart */}
            <div className="space-y-3 pt-2">
              <div className="flex items-end justify-between h-28 px-2 pt-4 relative">
                {/* Horizontal target guide line */}
                <div 
                  className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/30 dark:border-rose-500/20 z-0"
                  style={{ bottom: '70%', height: '0px' }}
                  title={`Target: ${targetCal} kkal`}
                />
                
                {weeklyData.map((d, index) => {
                  const pct = Math.min(100, Math.round((d.calories / targetCal) * 100))
                  const barHeight = pct > 0 ? `${Math.max(8, pct * 0.8)}%` : '6%'
                  const isSelected = d.date === selectedDate
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center flex-1 group cursor-pointer relative z-10"
                      onClick={() => router.push(`/?date=${d.date}`)}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-[10px] font-black rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg w-28 text-center -translate-y-1 select-none z-50">
                        <div className="font-bold border-b border-white/20 pb-0.5 mb-1">{d.dayName}, {d.date.slice(5)}</div>
                        <div className="font-mono">{d.calories} kkal</div>
                        <div className="text-[8px] font-medium opacity-80">P:{d.protein}g K:{d.carbs}g L:{d.fat}g</div>
                      </div>

                      {/* Bar */}
                      <div className="w-6 sm:w-8 h-20 flex items-end">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isSelected 
                              ? 'bg-lime-400 ring-2 ring-black dark:ring-white scale-x-105 shadow-sm' 
                              : d.calories > targetCal 
                              ? 'bg-emerald-500/80 group-hover:bg-emerald-500'
                              : d.calories === 0 
                              ? 'bg-slate-200 dark:bg-slate-800' 
                              : 'bg-lime-400/60 group-hover:bg-lime-400/85'
                          }`}
                          style={{ height: barHeight }}
                        />
                      </div>

                      {/* Day Label */}
                      <span className={`text-[10px] font-black mt-2 uppercase ${
                        isSelected 
                          ? 'text-lime-700 dark:text-lime-400 scale-110' 
                          : 'text-slate-700 dark:text-slate-400'
                      }`}>
                        {d.dayName}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="text-[10px] text-center font-bold text-slate-500 italic">
                *Klik kolom hari di atas untuk beralih tanggal
              </div>
            </div>
            
            {/* Average Macros */}
            <div className={`pt-3 border-t text-[10px] font-bold ${isLight ? 'border-slate-350' : 'border-slate-855'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500">Rata-rata Makronutrisi Harian:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] mt-1.5">
                <div className="p-1.5 rounded-xl bg-rose-500/5 text-rose-550 border border-rose-500/10">
                  <div className="font-black font-mono">{avgProtein}g</div>
                  <div className="text-[9px] font-medium opacity-80">Protein</div>
                </div>
                <div className="p-1.5 rounded-xl bg-amber-500/5 text-amber-600 dark:text-amber-500 border border-amber-500/10">
                  <div className="font-black font-mono">{avgCarbs}g</div>
                  <div className="text-[9px] font-medium opacity-80">Karbo</div>
                </div>
                <div className="p-1.5 rounded-xl bg-sky-500/5 text-sky-655 dark:text-sky-400 border border-sky-500/10">
                  <div className="font-black font-mono">{avgFat}g</div>
                  <div className="text-[9px] font-medium opacity-80">Lemak</div>
                </div>
              </div>
            </div>
          </div>
          <div className={`p-5 sm:p-6 rounded-3xl shadow-xs transition-colors space-y-4 border-2 ${
            isLight ? 'bg-white border-slate-400' : 'bg-[#0f1524] border-slate-900'
          }`}>
            <div>
              <h3 className="text-lg font-black tracking-tight">Makanan Favorit Anda</h3>
              <p className={`text-xs font-medium ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>Daftar tersimpan untuk pencatatan instan gratis</p>
            </div>

            {savedFoods.length === 0 ? (
              <div className={`text-center py-8 border border-dashed rounded-2xl px-4 ${
                isLight ? 'bg-slate-50/50 border-slate-400' : 'bg-slate-955/40 border-slate-850'
              }`}>
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>Belum ada makanan tersimpan. Cari makanan melalui asisten dan pilih simpan ke favorit!</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                {savedFoods.map((food) => (
                  <div key={food.id} className={`p-4 rounded-2xl border-2 transition-all ${
                    isLight ? 'bg-white border-slate-400 hover:border-slate-500 shadow-xs' : 'bg-slate-955 border-slate-900 hover:border-slate-850'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{food.food_name}</h4>
                        <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-750' : 'text-slate-505'}`}>({food.base_serving_description})</span>
                      </div>
                    </div>
                    <div className={`grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t text-center text-[10px] font-extrabold ${
                      isLight ? 'border-slate-400 text-slate-800' : 'border-slate-900 text-slate-550'
                    }`}>
                      <div>
                        <div className="text-slate-900 dark:text-slate-350 font-black">{food.calories}</div>
                        <div>kkal</div>
                      </div>
                      <div>
                        <div className="text-rose-500 font-black">{food.protein}g</div>
                        <div>Protein</div>
                      </div>
                      <div>
                        <div className="text-amber-550 font-black">{food.carbs}g</div>
                        <div>Karbo</div>
                      </div>
                      <div>
                        <div className="text-sky-500 font-black">{food.fat}g</div>
                        <div>Lemak</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>      {/* FLOATING PILL BOTTOM NAVIGATION BAR (Acuannya pada Gambar) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 dark:bg-black/80 border border-neutral-800/80 rounded-full px-5 sm:px-7 py-2.5 sm:py-3 flex items-center space-x-5 sm:space-x-7.5 shadow-2xl z-50 backdrop-blur-md">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setStatusMessage({ type: 'success', text: 'Kembali ke halaman utama dashboard.' })
          }}
          className="h-10 w-10 rounded-full bg-lime-400 text-black flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Beranda Dashboard"
        >
          <Home className="h-5 w-5" />
        </button>

        <button
          onClick={() => setShowRecalculate(true)}
          className="h-10 w-10 rounded-full text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          title="Kalkulator Profil & Target"
        >
          <Sliders className="h-5 w-5" />
        </button>

        <button
          onClick={() => setShowManualAdd(true)}
          className="h-10 w-10 rounded-full text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          title="Input Manual Makanan"
        >
          <Plus className="h-5 w-5" />
        </button>

        {profile.role === 'pro' && (
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="h-10 w-10 rounded-full text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Pengaturan Kunci API"
          >
            <Key className="h-5 w-5" />
          </button>
        )}
      </nav>

      {/* MODAL 1: Mifflin-St Jeor Recalculator */}
      {showRecalculate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md border-2 p-6 rounded-3xl shadow-2xl space-y-6 ${
            isLight ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-800'
          }`}>
            <div>
              <h3 className="text-xl font-black text-slate-850 dark:text-white">Atur Profil & Target Nutrisi</h3>
              <p className={`text-xs font-semibold mt-1 ${isLight ? 'text-slate-750' : 'text-slate-500'}`}>Sesuaikan kembali kalkulator target energi tubuh Anda</p>
            </div>

            <form onSubmit={handleRecalculate} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Jenis Kelamin</label>
                <select 
                  value={recalcForm.gender}
                  onChange={(e) => setRecalcForm({...recalcForm, gender: e.target.value})}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                    isLight ? 'bg-white border-slate-400 text-slate-805 focus:border-lime-550 shadow-sm' : 'bg-slate-950 border-slate-855 text-slate-200 focus:border-lime-500'
                  }`}
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Berat (kg)</label>
                  <input 
                    type="number" 
                    required
                    min="30"
                    max="300"
                    placeholder="70"
                    value={recalcForm.weight}
                    onChange={(e) => setRecalcForm({...recalcForm, weight: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                      isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-550 shadow-sm' : 'bg-slate-950 border-slate-855 text-slate-200 focus:border-lime-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Tinggi (cm)</label>
                  <input 
                    type="number" 
                    required
                    min="100"
                    max="250"
                    placeholder="170"
                    value={recalcForm.height}
                    onChange={(e) => setRecalcForm({...recalcForm, height: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                      isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-555 shadow-sm' : 'bg-slate-955 border-slate-850 text-slate-200 focus:border-lime-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Umur (tahun)</label>
                  <input 
                    type="number" 
                    required
                    min="10"
                    max="120"
                    placeholder="25"
                    value={recalcForm.age}
                    onChange={(e) => setRecalcForm({...recalcForm, age: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                      isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-555 shadow-sm' : 'bg-slate-955 border-slate-850 text-slate-200 focus:border-lime-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Tingkat Aktivitas Harian</label>
                <select 
                  value={recalcForm.activityLevel}
                  onChange={(e) => setRecalcForm({...recalcForm, activityLevel: Number(e.target.value)})}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                    isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-555 shadow-sm' : 'bg-slate-955 border-slate-850 text-slate-200 focus:border-lime-500'
                  }`}
                >
                  <option value={1.2}>Sangat Jarang Olahraga (Kerja kantoran di meja)</option>
                  <option value={1.375}>Olahraga Ringan (Olahraga 1-3 hari/minggu)</option>
                  <option value={1.55}>Aktif Sedang (Olahraga teratur 3-5 hari/minggu)</option>
                  <option value={1.725}>Sangat Aktif (Olahraga harian 6-7 hari/minggu)</option>
                  <option value={1.9}>Atlet / Pekerja Fisik Berat (Kerja fisik berat)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Target Kebugaran</label>
                <select 
                  value={recalcForm.goal}
                  onChange={(e) => setRecalcForm({...recalcForm, goal: e.target.value})}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden ${
                    isLight ? 'bg-white border-slate-400 text-slate-800 focus:border-lime-555 shadow-sm' : 'bg-slate-955 border-slate-850 text-slate-200 focus:border-lime-500'
                  }`}
                >
                  <option value="lose">Menurunkan Berat Badan (-500 kkal)</option>
                  <option value="maintain">Menjaga Berat Badan (Kalori seimbang)</option>
                  <option value="gain">Meningkatkan Massa Otot (+300 kkal)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowRecalculate(false)}
                  className={`flex-1 font-bold py-3 rounded-2xl text-sm cursor-pointer border ${
                    isLight ? 'bg-slate-100 border-slate-400 text-slate-800 hover:bg-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 disabled:opacity-50 text-black font-extrabold py-3 rounded-2xl text-sm cursor-pointer shadow-md"
                >
                  {isSubmitting ? 'Menghitung...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Configure API Key (Pro Tier / BYOK) */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md border-2 p-6 rounded-3xl shadow-2xl space-y-6 ${
            isLight ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-800'
          }`}>
            <div>
              <h3 className="text-lg font-black flex items-center">
                <Key className="h-5 w-5 text-lime-500 mr-2" />
                Kunci API Mandiri (Pro)
              </h3>
              <p className={`text-xs mt-1 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>
                Kunci API disimpan secara aman di dalam <span className="font-mono text-lime-700 dark:text-lime-400">localStorage</span> browser Anda.
                Kunci ini tidak akan pernah dikirimkan atau disimpan ke database kami.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-850' : 'text-slate-455'}`}>DeepSeek API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-..."
                  defaultValue={customApiKey}
                  id="api-key-input"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden font-mono shadow-sm ${
                    isLight ? 'bg-white border-slate-400 text-slate-900 focus:border-lime-500' : 'bg-slate-955 border-slate-850 text-slate-200 focus:border-lime-500'
                  }`}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowApiKeyModal(false)}
                  className={`flex-1 font-bold py-3 rounded-2xl text-sm cursor-pointer border ${
                    isLight ? 'bg-slate-100 border-slate-400 text-slate-800 hover:bg-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-755'
                  }`}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const input = document.getElementById('api-key-input') as HTMLInputElement
                    handleSaveApiKey(input.value)
                  }}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-extrabold py-3 rounded-2xl text-sm cursor-pointer shadow-md shadow-lime-950/10"
                >
                  Simpan Kunci
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
