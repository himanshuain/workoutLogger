import { useState } from 'react';
import { useRouter } from 'next/router';
import { useWorkout } from '@/context/WorkoutContext';

export default function Auth() {
  const router = useRouter();
  const { signIn, signUp, user } = useWorkout();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect if already logged in
  if (user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        router.push('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron-950 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lift-primary to-lift-secondary flex items-center justify-center">
          <svg className="w-10 h-10 text-iron-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-iron-100">Logbook</h1>
        <p className="text-iron-500 mt-1">Simple workout logging</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-iron-400 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-iron-900 text-iron-100 
                       placeholder-iron-600 outline-none focus:ring-2 focus:ring-lift-primary/50
                       border border-iron-800"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-iron-400 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-iron-900 text-iron-100 
                       placeholder-iron-600 outline-none focus:ring-2 focus:ring-lift-primary/50
                       border border-iron-800"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-lift-primary/10 border border-lift-primary/20 text-lift-primary text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-lift-primary text-iron-950 font-bold
                     active:bg-lift-secondary transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-iron-950 border-t-transparent rounded-full animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-iron-400 text-sm"
          >
            {isSignUp ? (
              <>Already have an account? <span className="text-lift-primary">Sign in</span></>
            ) : (
              <>Don't have an account? <span className="text-lift-primary">Sign up</span></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

