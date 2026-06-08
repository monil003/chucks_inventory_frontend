import React, { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import RawItems from './pages/RawItems';
import Recipes from './pages/Recipes';
import ActiveSession from './pages/ActiveSession';
import { LayoutDashboard, ClipboardList, ChefHat, Activity, ServerCrash } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rawItems, setRawItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setConnError(false);

      const [itemsData, recipesData, sessionsData, activeSessionData] = await Promise.all([
        api.getRawItems(),
        api.getRecipes(),
        api.getSessions(),
        api.getActiveSession()
      ]);

      setRawItems(itemsData);
      setRecipes(recipesData);
      setSessions(sessionsData);
      setActiveSession(activeSessionData);
    } catch (err) {
      console.error('Connection error with Express API backend', err);
      setConnError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Operation callbacks passed to pages
  const handleCreateRawItem = async (item) => {
    const newItem = await api.createRawItem(item);
    setRawItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleDeleteRawItem = async (id) => {
    await api.deleteRawItem(id);
    setRawItems(prev => prev.filter(item => item._id !== id));
  };

  const handleRefreshRawItems = async () => {
    try {
      const itemsData = await api.getRawItems();
      setRawItems(itemsData);
    } catch (err) {
      console.error('Failed to refresh raw items', err);
    }
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

  const refreshSession = async () => {
    const data = await api.getActiveSession();
    setActiveSession(data);
  };

  const refreshHistory = async () => {
    const data = await api.getSessions();
    setSessions(data);
  };

  if (connError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at 50% 0%, #151821 0%, #08090c 100%)', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <ServerCrash size={64} style={{ color: 'var(--danger)', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Express Backend Connection Failed</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '2rem' }}>
          Could not communicate with the backend server running on `http://localhost:5001`. Please verify that the API server is active and running.
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

  return (
    <div className="app-container">
      {/* Persistent Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Activity size={28} style={{ color: 'var(--primary)' }} />
          <span className="logo-text">Chuck's Inventory</span>
        </div>
        
        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="nav-icon" />
            Dashboard
          </div>

          <div 
            className={`nav-item ${activeTab === 'raw-items' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw-items')}
          >
            <ClipboardList className="nav-icon" />
            Ingredients
          </div>

          <div 
            className={`nav-item ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <ChefHat className="nav-icon" />
            Recipes
          </div>

          <div 
            className={`nav-item ${activeTab === 'session' ? 'active' : ''}`}
            onClick={() => setActiveTab('session')}
          >
            <Activity className="nav-icon" />
            Day End Count
          </div>
        </nav>
        
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
            Chuck's Restaurant &copy; {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            sessions={sessions} 
            rawItems={rawItems} 
            recipes={recipes} 
            onDeleteSession={handleDeleteSession}
          />
        )}

        {activeTab === 'raw-items' && (
          <RawItems 
            rawItems={rawItems} 
            onCreateRawItem={handleCreateRawItem}
            onDeleteRawItem={handleDeleteRawItem}
            onRefreshRawItems={handleRefreshRawItems}
          />
        )}

        {activeTab === 'recipes' && (
          <Recipes 
            recipes={recipes} 
            rawItems={rawItems} 
            onSaveRecipe={handleSaveRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        )}

        {activeTab === 'session' && (
          <ActiveSession 
            activeSession={activeSession}
            completedSessions={sessions.filter(s => s.status === 'completed')}
            rawItems={rawItems}
            refreshSession={refreshSession}
            refreshHistory={refreshHistory}
          />
        )}
      </main>
    </div>
  );
}
