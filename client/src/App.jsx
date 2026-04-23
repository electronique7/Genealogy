import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider, useAuth, canEdit } from './context/AuthContext';
import PeopleList   from './pages/PeopleList';
import PersonDetail from './pages/PersonDetail';
import PersonEdit   from './pages/PersonEdit';
import PersonNew    from './pages/PersonNew';
import FamilyDetail from './pages/FamilyDetail';
import TreeView     from './pages/TreeView';
import Login        from './pages/Login';
import Register     from './pages/Register';
import AdminUsers   from './pages/AdminUsers';
import SuperAdmin   from './pages/SuperAdmin';

// Fade wrapper — re-mounts on every route change, triggering the CSS animation
function PageFade({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-fade">
      {children}
    </div>
  );
}

// Redirect to /login if not authenticated, preserving intended destination
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

// Redirect to /people if not admin
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== 'admin') return <Navigate to="/people" replace />;
  return children;
}

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-green-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-20 gap-6">
        {/* Logo / title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-2xl leading-none">🌳</span>
          <div>
            <div className="font-bold text-base leading-tight tracking-wide text-white">Reinsel Family Tree</div>
            <div className="text-[11px] text-green-300 leading-tight tracking-wider">Genealogy Archive</div>
          </div>
        </div>

        <div className="w-px h-8 bg-green-700 mx-1 shrink-0" />

        <NavLink to="/people"
          className={({ isActive }) =>
            `text-sm font-medium px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`
          }>People</NavLink>

        <NavLink to="/tree"
          className={({ isActive }) =>
            `text-sm font-medium px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`
          }>Family Tree</NavLink>

        {user?.role === 'admin' && (<>
          <NavLink to="/admin/users"
            className={({ isActive }) =>
              `text-sm font-medium px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`
            }>Users</NavLink>
          <NavLink to="/admin/activity"
            className={({ isActive }) =>
              `text-sm font-medium px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`
            }>Activity</NavLink>
        </>)}

        {/* Right side: role badge + username + logout */}
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
            ${user?.role === 'admin'  ? 'bg-red-500/30 text-red-100'
            : user?.role === 'editor' ? 'bg-blue-500/30 text-blue-100'
            :                           'bg-white/20 text-white/70'}`}>
            {user?.role}
          </span>
          <span className="text-sm text-green-100">{user?.username}</span>
          <button
            onClick={logout}
            className="text-xs text-green-300 hover:text-white border border-green-600 hover:border-green-300 px-3 py-1.5 rounded-lg transition-colors"
          >Sign out</button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — all roles */}
        <Route path="/*" element={
          <RequireAuth>
            <>
              <NavBar />
              <PageFade>
                <Routes>
                  <Route path="/"                element={<Navigate to="/people" replace />} />
                  <Route path="/people"          element={<PeopleList />} />
                  <Route path="/people/:id"      element={<PersonDetail />} />
                  <Route path="/families/:id"    element={<FamilyDetail />} />
                  <Route path="/tree"            element={<TreeView />} />

                  {/* Editor + Admin only */}
                  <Route path="/people/new"      element={canEdit ? <PersonNew />    : <Navigate to="/people" replace />} />
                  <Route path="/people/:id/edit" element={canEdit ? <PersonEdit />   : <Navigate to="/people" replace />} />

                  {/* Admin only */}
                  <Route path="/admin/users"     element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                  <Route path="/admin/activity"  element={<RequireAdmin><SuperAdmin /></RequireAdmin>} />
                </Routes>
              </PageFade>
            </>
          </RequireAuth>
        } />
      </Routes>
    </div>
  );
}
