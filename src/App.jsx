import React, { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import RawItems from './pages/RawItems';
import Recipes from './pages/Recipes';
import DayInventoryCount from './pages/DayInventoryCount';
import DayEndSales from './pages/DayEndSales';
import AdminPanel from './pages/AdminPanel';
import Setup from './pages/Setup';
import { LayoutDashboard, ClipboardList, ChefHat, Activity, ServerCrash, Menu, X, LogOut, ShieldAlert, Store, Clock, Upload } from 'lucide-react';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === 'admin') return 'admin-panel';
      if (user.role === 'staff') return 'inventory-count';
      return 'dashboard';
    }
    return 'dashboard';
  });

  const [activeRestaurant, setActiveRestaurant] = useState(() => {
    const saved = localStorage.getItem('activeRestaurant');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminApprovedRestaurants, setAdminApprovedRestaurants] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rawItems, setRawItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);

  // Helper to fetch list of restaurants manager can switch to
  const getSwitchableRestaurants = () => {
    if (currentUser?.role === 'admin') {
      return adminApprovedRestaurants;
    }
    return currentUser?.restaurants ? currentUser.restaurants.filter(r => r.approved) : [];
  };

  const handleRefreshUser = async () => {
    if (!currentUser) return;
    try {
      const updated = await api.getProfile(currentUser._id);
      localStorage.setItem('currentUser', JSON.stringify(updated));
      setCurrentUser(updated);
    } catch (e) {
      console.error('Failed to refresh user profile', e);
    }
  };

  // Fetch initial data based on currentUser and activeRestaurant context
  const loadData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setConnError(false);

      let approvedRests = [];
      if (currentUser.role === 'admin') {
        try {
          const allRests = await api.getAdminRestaurants();
          approvedRests = allRests.filter(r => r.approved);
          setAdminApprovedRestaurants(approvedRests);
        } catch (e) {
          console.error("Failed to load restaurants for admin", e);
        }
      } else if (currentUser.restaurants) {
        // Refresh manager's profile to get latest restaurant approvals
        try {
          const profile = await api.getProfile(currentUser._id);
          localStorage.setItem('currentUser', JSON.stringify(profile));
          setCurrentUser(profile);
          approvedRests = profile.restaurants.filter(r => r.approved);
        } catch (e) {
          approvedRests = currentUser.restaurants.filter(r => r.approved);
        }
      }

      // Resolve activeRestaurant
      let currentRest = null;
      const savedRest = localStorage.getItem('activeRestaurant');
      if (savedRest) {
        try {
          const parsed = JSON.parse(savedRest);
          currentRest = approvedRests.find(r => r._id === parsed._id) || null;
        } catch (e) {}
      }
      
      if (!currentRest && approvedRests.length > 0) {
        currentRest = approvedRests[0];
      }

      // Update state and storage only if context changed
      if (currentRest?._id !== activeRestaurant?._id) {
        if (currentRest) {
          localStorage.setItem('activeRestaurant', JSON.stringify(currentRest));
          setActiveRestaurant(currentRest);
        } else {
          localStorage.removeItem('activeRestaurant');
          setActiveRestaurant(null);
        }
      }

      // Fetch restaurant-scoped inventory records only if a restaurant context exists
      if (currentRest) {
        const [itemsData, recipesData, sessionsData] = await Promise.all([
          api.getRawItems(),
          api.getRecipes(),
          api.getSessions()
        ]);

        setRawItems(itemsData);
        setRecipes(recipesData);
        setSessions(sessionsData);
      } else {
        setRawItems([]);
        setRecipes([]);
        setSessions([]);
      }
    } catch (err) {
      console.error('Connection error with Express API backend', err);
      setConnError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?._id, activeRestaurant?._id]);

  // Operation callbacks passed to pages
  const handleCreateRawItem = async (item) => {
    const newItem = await api.createRawItem(item);
    setRawItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleDeleteRawItem = async (id) => {
    await api.deleteRawItem(id);
    setRawItems(prev => prev.filter(item => item._id !== id));
  };

  const handleUpdateRawItem = async (id, updatedItem) => {
    const updated = await api.updateRawItem(id, updatedItem);
    setRawItems(prev => prev.map(item => item._id === id ? updated : item).sort((a, b) => a.name.localeCompare(b.name)));
    
    setRecipes(prevRecipes => prevRecipes.map(recipe => {
      const updatedIngredients = recipe.ingredients.map(ing => {
        if (ing.rawItemId && (ing.rawItemId._id === id || ing.rawItemId === id)) {
          return {
            ...ing,
            rawItemId: typeof ing.rawItemId === 'object' ? { ...ing.rawItemId, ...updated } : updated
          };
        }
        return ing;
      });
      return { ...recipe, ingredients: updatedIngredients };
    }));
  };

  const handleRefreshRawItems = async () => {
    try {
      const itemsData = await api.getRawItems();
      setRawItems(itemsData);
    } catch (err) {
      console.error('Failed to refresh raw items', err);
    }
  };

  const handleLogin = (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    
    // Pick default landing tab
    if (user.role === 'admin') {
      setActiveTab('admin-panel');
    } else if (user.role === 'staff') {
      setActiveTab('inventory-count');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeRestaurant');
    setCurrentUser(null);
    setActiveRestaurant(null);
    setActiveTab('dashboard');
  };

  const handleSaveRecipe = async (recipe) => {
    const saved = await api.saveRecipe(recipe);
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.menuItemSku === saved.menuItemSku);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated.sort((a, b) => a.menuItemName.localeCompare(b.menuItemName));
      }
      return [...prev, saved].sort((a, b) => a.menuItemName.localeCompare(b.menuItemName));
    });
  };

  const handleDeleteRecipe = async (id) => {
    await api.deleteRecipe(id);
    setRecipes(prev => prev.filter(r => r._id !== id));
  };

  const handleDeleteSession = async (id) => {
    await api.deleteSession(id);
    setSessions(prev => prev.filter(s => s._id !== id));
  };

  const handleSwitchRestaurant = (rest) => {
    localStorage.setItem('activeRestaurant', JSON.stringify(rest));
    setActiveRestaurant(rest);
  };

  const handleViewTab = (tabName) => {
    setActiveTab(tabName);
  };

  if (connError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at 50% 0%, #151821 0%, #08090c 100%)', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <ServerCrash size={64} style={{ color: 'var(--danger)', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Express Backend Connection Failed</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '2rem' }}>
          Could not communicate with the backend server. Please verify that the live API server is active and running.
        </p>
        <button className="btn btn-primary" onClick={loadData}>
          Try Reconnecting
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at 50% 0%, #151821 0%, #08090c 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Loading Inventory Data...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const switchableRests = getSwitchableRestaurants();

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={22} style={{ color: 'var(--primary)' }} />
          <span className="logo-text" style={{ fontSize: '1.2rem' }}>Inventory Management</span>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Backdrop (mobile) */}
      <div
        className={`sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Persistent Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo-container" style={{ marginBottom: '1.5rem' }}>
          <Activity size={28} style={{ color: 'var(--primary)' }} />
          <span className="logo-text" style={{ fontSize: '1.35rem' }}>Inventory Mgmt</span>
        </div>

        {/* Restaurant Context Selector */}
        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.35rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Store size={12} /> Scoped Restaurant
            </label>
            {switchableRests.length > 0 ? (
              <select
                value={activeRestaurant?._id || ''}
                onChange={(e) => {
                  const selected = switchableRests.find(r => r._id === e.target.value);
                  if (selected) handleSwitchRestaurant(selected);
                }}
                className="input-field"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', cursor: 'pointer', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {switchableRests.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                No active restaurants
              </div>
            )}
          </div>
        )}
        
        <nav className="nav-links">
          {currentUser.role === 'admin' && (
            <div 
              className={`nav-item ${activeTab === 'admin-panel' ? 'active' : ''}`}
              onClick={() => handleNavClick('admin-panel')}
            >
              <ShieldAlert className="nav-icon" />
              Admin Panel
            </div>
          )}

          {currentUser.role !== 'staff' && (
            <>
              <div 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''} ${!activeRestaurant ? 'btn-disabled' : ''}`}
                onClick={() => activeRestaurant && handleNavClick('dashboard')}
                title={!activeRestaurant ? 'Awaiting approved restaurant context' : ''}
              >
                <LayoutDashboard className="nav-icon" />
                Dashboard
              </div>

              <div 
                className={`nav-item ${activeTab === 'raw-items' ? 'active' : ''} ${!activeRestaurant ? 'btn-disabled' : ''}`}
                onClick={() => activeRestaurant && handleNavClick('raw-items')}
                title={!activeRestaurant ? 'Awaiting approved restaurant context' : ''}
              >
                <ClipboardList className="nav-icon" />
                Ingredients
              </div>

              <div 
                className={`nav-item ${activeTab === 'recipes' ? 'active' : ''} ${!activeRestaurant ? 'btn-disabled' : ''}`}
                onClick={() => activeRestaurant && handleNavClick('recipes')}
                title={!activeRestaurant ? 'Awaiting approved restaurant context' : ''}
              >
                <ChefHat className="nav-icon" />
                Recipes
              </div>
            </>
          )}

          <div 
            className={`nav-item ${activeTab === 'inventory-count' ? 'active' : ''} ${!activeRestaurant ? 'btn-disabled' : ''}`}
            onClick={() => activeRestaurant && handleNavClick('inventory-count')}
            title={!activeRestaurant ? 'Awaiting approved restaurant context' : ''}
          >
            <ClipboardList className="nav-icon" />
            Day Stock Count
          </div>

          {currentUser.role !== 'staff' && (
            <div 
              className={`nav-item ${activeTab === 'end-sales' ? 'active' : ''} ${!activeRestaurant ? 'btn-disabled' : ''}`}
              onClick={() => activeRestaurant && handleNavClick('end-sales')}
              title={!activeRestaurant ? 'Awaiting approved restaurant context' : ''}
            >
              <Upload className="nav-icon" />
              Day End Sales
            </div>
          )}

          {currentUser.role === 'manager' && (
            <div 
              className={`nav-item ${activeTab === 'setup' ? 'active' : ''}`}
              onClick={() => handleNavClick('setup')}
            >
              <Store className="nav-icon" />
              Setup Directory
            </div>
          )}
        </nav>
        
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'lowercase', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {currentUser.username}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'var(--transition-fast)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
            Inventory Management &copy; {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {!activeRestaurant && currentUser.role !== 'admin' ? (
          <>
            {activeTab === 'setup' && currentUser.role === 'manager' ? (
              <Setup 
                activeRestaurant={activeRestaurant} 
                currentUser={currentUser} 
                onRefreshUser={handleRefreshUser}
              />
            ) : (
              <div className="card text-center animate-fade-in" style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', border: 'var(--glass-border)', maxWidth: '600px', margin: '4rem auto' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                  <Clock size={32} />
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Awaiting Restaurant Activation</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                  Your registered account and restaurant profile are currently pending administrator approval. Please wait for activation or contact the administrator.
                </p>
                {currentUser.role === 'manager' && (
                  <button className="btn btn-primary" onClick={() => setActiveTab('setup')}>
                    Go to Setup Directory
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {activeTab === 'admin-panel' && currentUser.role === 'admin' && (
              <AdminPanel />
            )}

            {activeTab === 'setup' && currentUser.role === 'manager' && (
              <Setup 
                activeRestaurant={activeRestaurant} 
                currentUser={currentUser} 
                onRefreshUser={handleRefreshUser}
              />
            )}

            {activeTab === 'dashboard' && activeRestaurant && (
              <Dashboard 
                sessions={sessions} 
                rawItems={rawItems} 
                recipes={recipes} 
                onDeleteSession={handleDeleteSession}
                onViewTab={handleViewTab}
              />
            )}

            {activeTab === 'raw-items' && activeRestaurant && (
              <RawItems 
                rawItems={rawItems} 
                onCreateRawItem={handleCreateRawItem}
                onUpdateRawItem={handleUpdateRawItem}
                onDeleteRawItem={handleDeleteRawItem}
                onRefreshRawItems={handleRefreshRawItems}
              />
            )}

            {activeTab === 'recipes' && activeRestaurant && (
              <Recipes 
                recipes={recipes} 
                rawItems={rawItems} 
                onSaveRecipe={handleSaveRecipe}
                onDeleteRecipe={handleDeleteRecipe}
              />
            )}

            {activeTab === 'inventory-count' && activeRestaurant && (
              <DayInventoryCount 
                rawItems={rawItems}
                completedSessions={sessions.filter(s => s.status === 'completed')}
                onRefreshAll={loadData}
              />
            )}

            {activeTab === 'end-sales' && activeRestaurant && (
              <DayEndSales 
                onRefreshAll={loadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (isRegistering) {
      if (!username.trim() || !password.trim() || !restaurantName.trim()) {
        setError('Please fill in all fields');
        return;
      }
      setSubmitting(true);
      try {
        const res = await api.register(username.trim(), password.trim(), restaurantName.trim());
        setSuccess(res.message || 'Registration successful! Awaiting admin approval.');
        setUsername('');
        setPassword('');
        setRestaurantName('');
        setIsRegistering(false);
      } catch (err) {
        setError(err.message || 'Registration failed.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!username.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      setSubmitting(true);
      try {
        const user = await api.login(username.trim(), password.trim());
        onLogin(user);
      } catch (err) {
        setError(err.message || 'Login failed. Invalid username or password.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #151821 0%, #08090c 100%)', padding: '1.5rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', border: 'var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', background: 'rgba(18, 20, 26, 0.75)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
            <Activity size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Inventory Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isRegistering ? 'Register your manager account' : 'Sign in to manage restaurant stock'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{isRegistering ? 'Email Address' : 'Username'}</label>
            <input
              type={isRegistering ? 'email' : 'text'}
              className="input-field"
              placeholder={isRegistering ? 'Enter your email' : 'Enter username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              autoFocus
              style={{ background: 'rgba(0, 0, 0, 0.2)' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: isRegistering ? '1.5rem' : '2rem' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              style={{ background: 'rgba(0, 0, 0, 0.2)' }}
            />
          </div>

          {isRegistering && (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Restaurant Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Chuck's Diner"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                disabled={submitting}
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem' }} 
            disabled={submitting}
          >
            {submitting ? (isRegistering ? 'Registering...' : 'Signing in...') : (isRegistering ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccess('');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register Here"}
          </button>
        </div>
        
        {!isRegistering && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p>Default accounts (password is username + 123):</p>
            <p style={{ marginTop: '0.25rem', fontWeight: 600 }}>admin | manager | staff</p>
          </div>
        )}
      </div>
    </div>
  );
}
