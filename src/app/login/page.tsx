'use client'

import { useActionState } from 'react'
import { signIn } from '@/app/actions'
import Link from 'next/link'
import { Loader2, Activity } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 sm:px-6 lg:px-8 text-white">
      <div className="w-full max-w-md space-y-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative ambient light */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Log in to your NutriFit account
          </p>
        </div>

        <form className="mt-8 space-y-6" action={formAction}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-white placeholder-slate-500 focus:z-10 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-white placeholder-slate-500 focus:z-10 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {state?.error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
              {state.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 px-4 text-sm font-semibold text-black hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
