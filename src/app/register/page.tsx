'use client'

import React, { useState, useEffect, useActionState } from 'react'
import { signUp } from '@/app/actions'
import Link from 'next/link'
import { Loader2, Activity, Sun, Moon } from 'lucide-react'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
      setTheme(savedTheme)
      
      const root = window.document.documentElement
      if (savedTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  // Toggle theme action
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', nextTheme)
    setTheme(nextTheme)
    
    const root = window.document.documentElement
    if (nextTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const isLight = theme === 'light'

  return (
    <div className={`flex min-h-screen items-center justify-center transition-colors duration-300 px-4 py-12 sm:px-6 lg:px-8 font-sans ${
      isLight ? 'bg-[#f4f7f2] text-slate-900' : 'bg-[#0b0f17] text-slate-100'
    }`}>
      {/* Theme Switcher in top right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title={isLight ? 'Ganti ke Mode Malam' : 'Ganti ke Mode Terang'}
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      <div className={`w-full max-w-md space-y-8 p-8 rounded-3xl border-2 transition-all relative overflow-hidden shadow-xl ${
        isLight ? 'bg-white border-slate-300' : 'bg-[#0f1524] border-slate-900'
      }`}>
        {/* Decorative ambient light */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center relative z-10">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
            isLight ? 'bg-lime-400/20 text-lime-700 border-lime-400/40' : 'bg-lime-400/20 text-lime-400 border-lime-400/30'
          }`}>
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-lime-600 to-teal-500">
            NutriFit
          </h2>
          <p className={`mt-2 text-center text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
            Daftar akun baru dan mulai pantau asupan nutrisi Anda
          </p>
        </div>

        <form className="mt-8 space-y-6 relative z-10" action={formAction}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                Nama Pengguna
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`relative block w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-lime-500 transition-all shadow-xs ${
                  isLight 
                    ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-500 focus:border-lime-500' 
                    : 'bg-slate-900 border-slate-800 text-white placeholder-slate-400 focus:border-lime-500'
                }`}
                placeholder="Farhan"
              />
            </div>
            <div>
              <label htmlFor="email" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`relative block w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-lime-500 transition-all shadow-xs ${
                  isLight 
                    ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-500 focus:border-lime-500' 
                    : 'bg-slate-900 border-slate-800 text-white placeholder-slate-400 focus:border-lime-500'
                }`}
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                Kata Sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`relative block w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-lime-500 transition-all shadow-xs ${
                  isLight 
                    ? 'bg-white border-slate-400 text-slate-900 placeholder-slate-500 focus:border-lime-500' 
                    : 'bg-slate-900 border-slate-800 text-white placeholder-slate-400 focus:border-lime-500'
                }`}
                placeholder="•••••••• (min. 6 karakter)"
              />
            </div>
          </div>

          {state?.error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {state.success}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-400 to-teal-500 py-3.5 px-4 text-sm font-extrabold text-black hover:opacity-95 focus:outline-hidden focus:ring-2 focus:ring-lime-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-lime-950/10"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-black" />
              ) : (
                'Daftar Akun'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 relative z-10 border-t pt-4 border-dashed border-slate-300 dark:border-slate-800">
          <p className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
            Sudah punya akun?{' '}
            <Link href="/login" className="font-bold text-lime-700 dark:text-lime-400 hover:underline transition-colors">
              Masuk akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}    </div>
  )
}
