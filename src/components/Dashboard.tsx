'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Activity, Plus, Trash2, Search, Brain, Key, Settings, 
  RefreshCw, LogOut, Check, Sparkles, User, Database, Dumbbell, AlertTriangle 
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
  } | null
  foodEntries: FoodEntry[]
  savedFoods: SavedFood[]
  selectedDate: string
}

export default function Dashboard({ 
  profile, 
  dailyLog, 
  foodEntries, 
  savedFoods, 
  selectedDate 
}: DashboardProps) {
  const router = useRouter()
  
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
  const [aiResult, setAiResult] = useState<AIExtractionResponse | null>(null)
  const [aiSaveToLib, setAiSaveToLib] = useState(true)
  const [aiError, setAiError] = useState<string | null>(null)
  
  // Forms states
  const [recalcForm, setRecalcForm] = useState({
    gender: 'male',
    weight: 75,
    height: 175,
    age: 28,
    activityLevel: 1.375,
    goal: 'maintain'
  })
  
  const [manualForm, setManualForm] = useState({
    food_name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    saveToDatabase: false
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load API Key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('deepseek_api_key') || ''
      setCustomApiKey(key)
    }
  }, [])

  // Save API Key to localStorage
  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('deepseek_api_key', key)
    setCustomApiKey(key)
    setShowApiKeyModal(false)
    setStatusMessage({ type: 'success', text: 'API Key saved locally.' })
  }

  // Handle hybrid search autocompletion
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

  // Handle manual macro calculations
  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMessage(null)
    
    const res = await recalculateMacros({
      gender: recalcForm.gender as 'male' | 'female',
      weight: Number(recalcForm.weight),
      height: Number(recalcForm.height),
      age: Number(recalcForm.age),
      activityLevel: Number(recalcForm.activityLevel),
      goal: recalcForm.goal as 'lose' | 'maintain' | 'gain'
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: 'Macros targets updated successfully!' })
      setShowRecalculate(false)
      router.refresh()
    }
  }

  // Handle adding direct portion-multiplied saved food
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
      setStatusMessage({ type: 'success', text: `Logged ${selectedSavedFood.food_name} (${portionMultiplier}x serving)` })
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
        calories: manualForm.calories,
        protein: manualForm.protein,
        carbs: manualForm.carbs,
        fat: manualForm.fat
      }],
      calories: manualForm.calories,
      protein: manualForm.protein,
      carbs: manualForm.carbs,
      fat: manualForm.fat,
      multiplier: 1,
      saveToSavedFoods: manualForm.saveToDatabase
    })

    setIsSubmitting(false)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: `Successfully logged "${manualForm.food_name}"` })
      setManualForm({
        food_name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        saveToDatabase: false
      })
      setShowManualAdd(false)
      router.refresh()
    }
  }

  // Handle DeepSeek AI parsing NLU
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
          setAiError('Your account is in Pro Tier (BYOK). Please configure your DeepSeek API Key to proceed.')
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
        throw new Error(data.error || 'Failed to analyze food query')
      }

      setAiResult(data)
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong')
    } finally {
      setAiLoading(false)
    }
  }

  // Save the result parsed by AI into daily logs
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
      setStatusMessage({ type: 'success', text: `Successfully logged AI parsed food: "${aiResult.food_name}"` })
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
      setStatusMessage({ type: 'success', text: 'Log entry removed' })
      router.refresh()
    }
  }

  // Role Toggler for easy user testing
  const handleToggleRole = async () => {
    const nextRole = profile.role === 'free' ? 'pro' : 'free'
    const res = await toggleUserRole(nextRole)
    if (res.error) {
      setStatusMessage({ type: 'error', text: res.error })
    } else {
      setStatusMessage({ type: 'success', text: `Switched tier to ${nextRole.toUpperCase()}` })
      router.refresh()
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
  const fatPercentage = Math.min(100, Math.round((loggedFat / targetFat) * 100))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                NutriFit Tracker
              </h1>
              <p className="text-xs text-slate-400">AI-Powered Fitness Ledger</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {profile.username && (
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-350">
                <User className="h-3.5 w-3.5 text-emerald-400" />
                <span>Hi, {profile.username}</span>
              </div>
            )}

            {/* Quick date display/selector */}
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => router.push(`/?date=${e.target.value}`)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />

            {/* Role indicator / settings switcher */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={handleToggleRole}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                  profile.role === 'free' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Click to toggle tier"
              >
                Free
              </button>
              <button 
                onClick={handleToggleRole}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                  profile.role === 'pro' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Click to toggle tier"
              >
                Pro
              </button>
            </div>

            {profile.role === 'pro' && (
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 p-2 rounded-lg transition-colors relative"
                title="Configure DeepSeek API Key"
              >
                <Key className="h-4 w-4" />
                {!customApiKey && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>
            )}

            <button
              onClick={() => signOutAction()}
              className="text-slate-400 hover:text-rose-400 p-2 rounded-lg transition-colors"
              title="Sign Out"
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
          <div className={`col-span-12 p-4 rounded-xl border flex items-center justify-between ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="text-sm font-medium">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100 font-bold px-2">✕</button>
          </div>
        )}

        {/* Column 1: Progress Indicators (lg: 8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Targets Progress Panel */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center">
                  <Dumbbell className="h-5 w-5 text-emerald-400 mr-2" />
                  Daily Nutrition Summary
                </h2>
                <p className="text-xs text-slate-400">Comparing your intake against calculated TDEE targets</p>
              </div>
              <button 
                onClick={() => setShowRecalculate(true)}
                className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Recalculate Macros
              </button>
            </div>

            {/* Calories Ring / Progress */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 flex flex-col items-center justify-center border-r border-slate-800/50 pr-4 md:border-r-slate-800">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Calories</span>
                <span className="text-3xl font-extrabold text-white mt-1">{loggedCal}</span>
                <span className="text-xs text-slate-500 mt-1">/ {targetCal} kcal</span>
                
                {/* Visual Progress Pill */}
                <div className="w-full bg-slate-950 rounded-full h-2 mt-4 overflow-hidden border border-slate-850">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${calPercentage}%` }}
                  />
                </div>
                <span className="text-xs text-emerald-400 font-semibold mt-1">{calPercentage}%</span>
              </div>

              {/* Macros Breakdown Progress Bars */}
              <div className="md:col-span-3 space-y-4 justify-center flex flex-col">
                {/* Protein */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-400">Protein (g)</span>
                    <span className="text-slate-300">{loggedProtein}g / {targetProtein}g</span>
                  </div>
                  <div className="bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${proteinPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-400">Carbs (g)</span>
                    <span className="text-slate-300">{loggedCarbs}g / {targetCarbs}g</span>
                  </div>
                  <div className="bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${carbsPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-sky-400">Fat (g)</span>
                    <span className="text-slate-300">{loggedFat}g / {targetFat}g</span>
                  </div>
                  <div className="bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${fatPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logging Component / search and options */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold text-slate-100 flex items-center">
                  <Plus className="h-5 w-5 text-emerald-400 mr-2" />
                  Log Food Entry
                </h3>
                <p className="text-xs text-slate-400">Type to search foods, use AI extraction, or add manually</p>
              </div>
              <button 
                onClick={() => setShowManualAdd(!showManualAdd)}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showManualAdd ? 'Cancel Manual Add' : 'Manual Add Macros'}
              </button>
            </div>

            {showManualAdd ? (
              /* Manual Input Form */
              <form onSubmit={handleManualInsert} className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Manual Add Form</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Food Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. White Rice"
                      value={manualForm.food_name}
                      onChange={(e) => setManualForm({...manualForm, food_name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Calories (kcal)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={manualForm.calories || ''}
                      onChange={(e) => setManualForm({...manualForm, calories: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Protein (g)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={manualForm.protein || ''}
                      onChange={(e) => setManualForm({...manualForm, protein: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Carbs (g)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={manualForm.carbs || ''}
                      onChange={(e) => setManualForm({...manualForm, carbs: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Fat (g)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={manualForm.fat || ''}
                      onChange={(e) => setManualForm({...manualForm, fat: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input 
                    type="checkbox" 
                    id="saveToDatabase" 
                    checked={manualForm.saveToDatabase}
                    onChange={(e) => setManualForm({...manualForm, saveToDatabase: e.target.checked})}
                    className="rounded-sm border-slate-850 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="saveToDatabase" className="text-xs text-slate-400 cursor-pointer">
                    Save to My Foods Database (for instant future searches)
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2 rounded-lg transition-colors cursor-pointer text-sm"
                >
                  {isSubmitting ? 'Logging...' : 'Log Food Entry'}
                </button>
              </form>
            ) : (
              /* Hybrid Input Search and AI Generation Area */
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500" />
                  </div>
                  <input 
                    type="text" 
                    placeholder='Type food name (e.g. "Mie Gacoan", "1 raw apple", "chicken breast bowl")...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500 placeholder-slate-500 transition-colors"
                  />
                </div>

                {/* Hybrid Search Autocomplete Panel */}
                {searchResults.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 max-h-60 overflow-y-auto divide-y divide-slate-800/50 shadow-2xl">
                    <div className="px-2.5 py-1 text-slate-500 text-xs font-semibold flex items-center">
                      <Database className="h-3 w-3 mr-1" />
                      Matches in personal database
                    </div>
                    {searchResults.map((food) => (
                      <button 
                        key={food.id}
                        onClick={() => setSelectedSavedFood(food)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-850/80 transition-colors flex justify-between items-center text-sm cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-slate-200">{food.food_name}</span>
                          <span className="text-xs text-slate-500 ml-2">({food.base_serving_description})</span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {food.calories} kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Displaying selected match portion adjuster */}
                {selectedSavedFood && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-400">Library Food Match Found!</h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Selected: <span className="font-semibold text-white">{selectedSavedFood.food_name}</span> ({selectedSavedFood.base_serving_description})
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedSavedFood(null)} 
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Clear Selection
                      </button>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Portion Multiplier (e.g. 1.5x portion)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3.0" 
                            step="0.1" 
                            value={portionMultiplier}
                            onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                            className="flex-1 accent-emerald-500 h-1 bg-slate-850 rounded-lg cursor-pointer"
                          />
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0.01"
                            value={portionMultiplier}
                            onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center w-16 focus:outline-hidden"
                          />
                          <span className="text-xs font-semibold text-slate-300">x portion</span>
                        </div>
                      </div>
                    </div>

                    {/* Portioned calculations preview */}
                    <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 text-xs flex justify-around text-slate-300">
                      <div>Calories: <span className="font-bold text-white">{Math.round(selectedSavedFood.calories * portionMultiplier)} kcal</span></div>
                      <div>P: <span className="font-bold text-rose-400">{Math.round(selectedSavedFood.protein * portionMultiplier * 10) / 10}g</span></div>
                      <div>C: <span className="font-bold text-amber-400">{Math.round(selectedSavedFood.carbs * portionMultiplier * 10) / 10}g</span></div>
                      <div>F: <span className="font-bold text-sky-400">{Math.round(selectedSavedFood.fat * portionMultiplier * 10) / 10}g</span></div>
                    </div>

                    <button 
                      onClick={handleAddSavedFood}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2 rounded-lg text-xs tracking-wide transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Logging...' : 'Log Portioned Library Food'}
                    </button>
                  </div>
                )}

                {/* If search result has no matches, suggest generating via DeepSeek AI */}
                {searchTerm.trim() !== '' && !selectedSavedFood && (
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex items-center space-x-3 pr-2">
                      <Brain className="h-5 w-5 text-emerald-400" />
                      <div>
                        <div className="text-sm font-semibold text-slate-200">Parse with DeepSeek NLU</div>
                        <div className="text-xs text-slate-400">
                          {profile.role === 'free' 
                            ? 'Uses Free daily request limit (1 per day).' 
                            : 'Unlimited parsing using your configured API Key.'}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleAiExtract}
                      disabled={aiLoading}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 disabled:opacity-50 text-black font-semibold text-xs py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center whitespace-nowrap shadow-md shadow-emerald-950/20"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Generate with AI
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI NLU Review Panel */}
            {aiError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI Parsing Error: </span>
                  {aiError}
                </div>
              </div>
            )}

            {aiResult && (
              <div className="bg-slate-950 border border-emerald-500/20 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">AI Parsed Result</span>
                    <h4 className="text-md font-bold text-white mt-0.5">{aiResult.food_name}</h4>
                  </div>
                  <button 
                    onClick={() => setAiResult(null)} 
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Discard
                  </button>
                </div>

                {/* Ingredients table breakdown */}
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Parsed Ingredients</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-900">
                          <th className="pb-1.5 font-semibold">Ingredient</th>
                          <th className="pb-1.5 font-semibold text-right">Est. Weight</th>
                          <th className="pb-1.5 font-semibold text-right">Calories</th>
                          <th className="pb-1.5 font-semibold text-right">Protein</th>
                          <th className="pb-1.5 font-semibold text-right">Carbs</th>
                          <th className="pb-1.5 font-semibold text-right">Fat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {aiResult.parsed_ingredients.map((ing, i) => (
                          <tr key={i} className="text-slate-300">
                            <td className="py-2 text-slate-200 font-medium">{ing.ingredient_name}</td>
                            <td className="py-2 text-right text-slate-400">{ing.estimated_grams}g</td>
                            <td className="py-2 text-right">{ing.calories} kcal</td>
                            <td className="py-2 text-right text-rose-400">{ing.protein}g</td>
                            <td className="py-2 text-right text-amber-400">{ing.carbs}g</td>
                            <td className="py-2 text-right text-sky-400">{ing.fat}g</td>
                          </tr>
                        ))}
                        <tr className="font-bold text-white border-t border-slate-800">
                          <td className="py-2 text-emerald-400">Total</td>
                          <td className="py-2 text-right"></td>
                          <td className="py-2 text-right text-emerald-400">{aiResult.total_calories} kcal</td>
                          <td className="py-2 text-right text-rose-400">{aiResult.total_protein}g</td>
                          <td className="py-2 text-right text-amber-400">{aiResult.total_carbs}g</td>
                          <td className="py-2 text-right text-sky-400">{aiResult.total_fat}g</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input 
                    type="checkbox" 
                    id="aiSaveToLib" 
                    checked={aiSaveToLib}
                    onChange={(e) => setAiSaveToLib(e.target.checked)}
                    className="rounded-sm border-slate-850 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="aiSaveToLib" className="text-xs text-slate-400 cursor-pointer">
                    Save this food to my library for instant portions next time (no AI limit cost)
                  </label>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={handleSaveAiResult}
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Confirm and Log Daily Entry'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's Logged Foods List */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
            <div>
              <h3 className="text-md font-bold text-slate-100 flex items-center">
                <Activity className="h-5 w-5 text-emerald-400 mr-2" />
                Logged Foods - {selectedDate}
              </h3>
              <p className="text-xs text-slate-400">Items eaten and recorded today</p>
            </div>

            {foodEntries.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/40 border border-slate-900 border-dashed rounded-xl">
                <Database className="h-8 w-8 text-slate-650 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No food logs recorded for this day.</p>
                <p className="text-xs text-slate-500 mt-0.5">Use the search box above to start tracking!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900 bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden">
                {foodEntries.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-900/30 transition-colors">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-slate-200">{entry.raw_input}</span>
                      <div className="flex items-center space-x-3 flex-wrap text-xs text-slate-400">
                        <span className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 font-medium text-emerald-400">
                          {entry.calories} kcal
                        </span>
                        <span>P: {entry.protein}g</span>
                        <span>C: {entry.carbs}g</span>
                        <span>F: {entry.fat}g</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Personal Database Library (lg: 4) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
            <div>
              <h3 className="text-md font-bold text-slate-100 flex items-center">
                <Database className="h-5 w-5 text-emerald-400 mr-2" />
                Saved Foods Library
              </h3>
              <p className="text-xs text-slate-400">Personal database for fast portion multipliers (zero AI cost)</p>
            </div>

            {savedFoods.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/30 border border-slate-900 rounded-xl">
                <span className="text-xs text-slate-500">Your custom library is empty. Log a food via AI and save it to add ingredients here!</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                {savedFoods.map((food) => (
                  <div key={food.id} className="bg-slate-950 border border-slate-900 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">{food.food_name}</h4>
                        <span className="text-xs text-slate-500">({food.base_serving_description})</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-900 text-center text-[10px] font-semibold text-slate-400">
                      <div>
                        <div className="text-slate-300 font-bold">{food.calories}</div>
                        <div>kcal</div>
                      </div>
                      <div>
                        <div className="text-rose-400 font-bold">{food.protein}g</div>
                        <div>Protein</div>
                      </div>
                      <div>
                        <div className="text-amber-400 font-bold">{food.carbs}g</div>
                        <div>Carbs</div>
                      </div>
                      <div>
                        <div className="text-sky-400 font-bold">{food.fat}g</div>
                        <div>Fat</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* MODAL 1: Mifflin-St Jeor Recalculator */}
      {showRecalculate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Recalculate Macros Target</h3>
              <p className="text-xs text-slate-450 mt-0.5">Calculates resting BMR & TDEE using Mifflin-St Jeor equation</p>
            </div>

            <form onSubmit={handleRecalculate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1">Gender</label>
                <select 
                  value={recalcForm.gender}
                  onChange={(e) => setRecalcForm({...recalcForm, gender: e.target.value})}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-350 mb-1">Weight (kg)</label>
                  <input 
                    type="number" 
                    required
                    min="30"
                    max="300"
                    value={recalcForm.weight}
                    onChange={(e) => setRecalcForm({...recalcForm, weight: Number(e.target.value)})}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-350 mb-1">Height (cm)</label>
                  <input 
                    type="number" 
                    required
                    min="100"
                    max="250"
                    value={recalcForm.height}
                    onChange={(e) => setRecalcForm({...recalcForm, height: Number(e.target.value)})}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-350 mb-1">Age (years)</label>
                  <input 
                    type="number" 
                    required
                    min="10"
                    max="120"
                    value={recalcForm.age}
                    onChange={(e) => setRecalcForm({...recalcForm, age: Number(e.target.value)})}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1">Activity Level multiplier</label>
                <select 
                  value={recalcForm.activityLevel}
                  onChange={(e) => setRecalcForm({...recalcForm, activityLevel: Number(e.target.value)})}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value={1.2}>Sedentary (no active exercise, desk job)</option>
                  <option value={1.375}>Lightly Active (light exercise 1-3 days/wk)</option>
                  <option value={1.55}>Moderately Active (moderate exercise 3-5 days/wk)</option>
                  <option value={1.725}>Very Active (hard exercise 6-7 days/wk)</option>
                  <option value={1.9}>Extra Active (intense athlete / physical job)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1">Fitness Goal</label>
                <select 
                  value={recalcForm.goal}
                  onChange={(e) => setRecalcForm({...recalcForm, goal: e.target.value})}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="lose">Weight Loss (-500 kcal deficit)</option>
                  <option value="maintain">Weight Maintenance (TDEE baseline)</option>
                  <option value="gain">Muscle Gain (+300 kcal surplus)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowRecalculate(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  {isSubmitting ? 'Calculating...' : 'Recalculate & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Configure API Key (Pro Tier / BYOK) */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center">
                <Key className="h-5 w-5 text-cyan-400 mr-2" />
                Configure DeepSeek API Key
              </h3>
              <p className="text-xs text-slate-450 mt-1">
                Your account is set to <span className="text-cyan-400 font-bold">Pro Tier (BYOK)</span>.
                Your key will be stored securely only in your browser&apos;s <span className="font-mono text-cyan-455">localStorage</span>.
                It is never sent or stored in the database.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1">DeepSeek API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-..."
                  defaultValue={customApiKey}
                  id="api-key-input"
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const input = document.getElementById('api-key-input') as HTMLInputElement
                    handleSaveApiKey(input.value)
                  }}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
