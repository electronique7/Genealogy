import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ElmTree from '../assets/ElmTree';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/people', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center w-1/2 px-12 py-16"
        style={{
          background: 'linear-gradient(160deg, #2d5a1b 0%, #3d7a24 40%, #5a9e3a 75%, #7ab84e 100%)',
        }}
      >
        <ElmTree className="w-72 max-w-full drop-shadow-xl" />
        <h1 className="text-white text-3xl font-bold mt-8 text-center leading-tight tracking-wide">
          Reinsel Family Tree
        </h1>
        <p className="text-green-100 text-sm mt-3 text-center max-w-xs leading-relaxed opacity-90">
          Explore generations of family history, preserve stories, and discover connections across time.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/2 px-8 bg-amber-50">

        {/* Mobile title (hidden on md+) */}
        <div className="md:hidden text-center mb-8">
          <div className="text-5xl mb-2">🌳</div>
          <h1 className="text-2xl font-bold text-gray-800">Reinsel Family Tree</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 w-full max-w-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Sign In</h2>
          <p className="text-sm text-gray-400 mb-6">Welcome back</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Username
              </label>
              <input
                type="text" autoFocus required
                value={username} onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Password
              </label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-amber-800 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-700 hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
