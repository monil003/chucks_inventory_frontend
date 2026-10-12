import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  Wine, 
  Beer, 
  GlassWater, 
  Calendar, 
  Lock, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  ClipboardCheck, 
  TrendingDown, 
  TrendingUp, 
  Search, 
  Edit3,
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  Layers
} from 'lucide-react';

export default function LiquorStockCount({ currentUser, activeRestaurant }) {
  // Role checks
  const isFrontStaff = currentUser?.role === 'liquor_access';
  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  // Current client today date YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Front staff is permanently locked to today's date
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Active view tab: 'staff-sheet' | 'variance-report' | 'catalog-specs'
  const [activeSubTab, setActiveSubTab] = useState('staff-sheet');

  // Loading & Save states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Core Data
  const [catalog, setCatalog] = useState([]);
  const [countDoc, setCountDoc] = useState(null);
  const [previousCountDoc, setPreviousCountDoc] = useState(null);

  // Sheet Entry Form State
  const [amBartender, setAmBartender] = useState('');
  const [pmBartender, setPmBartender] = useState('');
  const [itemCounts, setItemCounts] = useState({}); // Key: itemName.toLowerCase() -> count fields
  const [wasteLogs, setWasteLogs] = useState([]);

  // Variance Data State
  const [varianceData, setVarianceData] = useState(null);
  const [loadingVariance, setLoadingVariance] = useState(false);
  const [soldInputs, setSoldInputs] = useState({}); // Key: itemName.toLowerCase() -> sold number

  // Catalog Item Editor Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'liquor',
    boxCount: 24,
    fullWeightOz: 0,
    liquorOz: 25,
    emptyWeightOz: 0
  });

  // Search filter for tables
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync date if front staff
  useEffect(() => {
    if (isFrontStaff && selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    }
  }, [isFrontStaff, todayStr, selectedDate]);

  // Load Liquor Count and Items for the selected date
  const loadDateData = async () => {
    if (!activeRestaurant) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getLiquorCount(selectedDate);
      
      setCatalog(data.catalog || []);
      setCountDoc(data.count || null);
      setPreviousCountDoc(data.previousCount || null);

      // Prepopulate bartender names
      setAmBartender(data.count?.amBartender || '');
      setPmBartender(data.count?.pmBartender || '');

      // Prepopulate items count map
      const initialMap = {};
      const soldMap = {};

      // Fill in default blanks for each catalog item
      (data.catalog || []).forEach(item => {
        const key = item.name.toLowerCase().trim();
        initialMap[key] = {
          itemId: item._id,
          name: item.name,
          category: item.category,
          amBarFridge: '',
          amAtBackBox: '',
          amBeerFridgeBottles: '',
          amRunningBottleOz: '',
          amAtBarFull: '',
          added: '',
          pmBarFridge: '',
          pmAtBackBox: '',
          pmBeerFridgeBottles: '',
          pmRunningBottleOz: '',
          pmAtBarFull: '',
          sold: ''
        };
        soldMap[key] = '';
      });

      // Overlay saved data from current countDoc
      if (data.count?.items) {
        data.count.items.forEach(savedItem => {
          const key = savedItem.name.toLowerCase().trim();
          initialMap[key] = {
            ...(initialMap[key] || {}),
            itemId: savedItem.itemId,
            name: savedItem.name,
            category: savedItem.category,
            amBarFridge: savedItem.amBarFridge !== undefined && savedItem.amBarFridge !== null ? savedItem.amBarFridge : '',
            amAtBackBox: savedItem.amAtBackBox !== undefined && savedItem.amAtBackBox !== null ? savedItem.amAtBackBox : '',
            amBeerFridgeBottles: savedItem.amBeerFridgeBottles !== undefined && savedItem.amBeerFridgeBottles !== null ? savedItem.amBeerFridgeBottles : '',
            amRunningBottleOz: savedItem.amRunningBottleOz !== undefined && savedItem.amRunningBottleOz !== null ? savedItem.amRunningBottleOz : '',
            amAtBarFull: savedItem.amAtBarFull !== undefined && savedItem.amAtBarFull !== null ? savedItem.amAtBarFull : '',
            added: savedItem.added !== undefined && savedItem.added !== null ? savedItem.added : '',
            pmBarFridge: savedItem.pmBarFridge !== undefined && savedItem.pmBarFridge !== null ? savedItem.pmBarFridge : '',
            pmAtBackBox: savedItem.pmAtBackBox !== undefined && savedItem.pmAtBackBox !== null ? savedItem.pmAtBackBox : '',
            pmBeerFridgeBottles: savedItem.pmBeerFridgeBottles !== undefined && savedItem.pmBeerFridgeBottles !== null ? savedItem.pmBeerFridgeBottles : '',
            pmRunningBottleOz: savedItem.pmRunningBottleOz !== undefined && savedItem.pmRunningBottleOz !== null ? savedItem.pmRunningBottleOz : '',
            pmAtBarFull: savedItem.pmAtBarFull !== undefined && savedItem.pmAtBarFull !== null ? savedItem.pmAtBarFull : '',
            sold: savedItem.sold !== undefined && savedItem.sold !== null ? savedItem.sold : ''
          };
          if (savedItem.sold) {
            soldMap[key] = savedItem.sold;
          }
        });
      }

      setItemCounts(initialMap);
      setSoldInputs(soldMap);
      setWasteLogs(data.count?.wasteLogs || []);

    } catch (err) {
      console.error('Failed to load liquor count data', err);
      setErrorMsg('Failed to fetch liquor count data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDateData();
  }, [selectedDate, activeRestaurant]);

  // Load Variance Report when switching to variance tab
  const loadVarianceReport = async () => {
    if (!activeRestaurant || isFrontStaff) return;
    try {
      setLoadingVariance(true);
      const res = await api.getLiquorVariance(selectedDate);
      setVarianceData(res);
      
      // Update soldInputs map with any saved sold values
      const updatedSold = { ...soldInputs };
      if (res?.report) {
        res.report.forEach(r => {
          const key = r.name.toLowerCase().trim();
          if (r.sold !== undefined && r.sold !== null) {
            updatedSold[key] = r.sold;
          } else if (r.soldOz !== undefined && r.soldOz !== null) {
            updatedSold[key] = r.soldOz;
          }
        });
        setSoldInputs(updatedSold);
      }
    } catch (err) {
      console.error('Failed to load variance report', err);
    } finally {
      setLoadingVariance(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'variance-report') {
      loadVarianceReport();
    }
  }, [activeSubTab, selectedDate, activeRestaurant]);

  // Handle Input Changes for Staff Count Table
  const handleItemCountChange = (itemName, field, value) => {
    const key = itemName.toLowerCase().trim();
    setItemCounts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value === '' ? '' : Number(value)
      }
    }));
  };

  // Add Waste Row
  const handleAddWasteRow = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setWasteLogs(prev => [
      ...prev,
      {
        time: timeStr,
        item: catalog[0]?.name || '',
        amount: 1,
        unit: 'oz',
        reason: 'Spill / Flush',
        loggedBy: currentUser?.username || ''
      }
    ]);
  };

  const handleUpdateWasteRow = (index, field, value) => {
    setWasteLogs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveWasteRow = (index) => {
    setWasteLogs(prev => prev.filter((_, i) => i !== index));
  };

  // Save Daily Sheet
  const handleSaveSheet = async () => {
    setErrorMsg('');
    setSaveSuccess('');
    setSaving(true);

    try {
      // Build items array
      const itemsPayload = Object.values(itemCounts).map(item => ({
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        amBarFridge: item.amBarFridge === '' ? 0 : Number(item.amBarFridge),
        amAtBackBox: item.amAtBackBox === '' ? 0 : Number(item.amAtBackBox),
        amBeerFridgeBottles: item.amBeerFridgeBottles === '' ? 0 : Number(item.amBeerFridgeBottles),
        amRunningBottleOz: item.amRunningBottleOz === '' ? 0 : Number(item.amRunningBottleOz),
        amAtBarFull: item.amAtBarFull === '' ? 0 : Number(item.amAtBarFull),
        added: item.added === '' ? 0 : Number(item.added),
        pmBarFridge: item.pmBarFridge === '' ? 0 : Number(item.pmBarFridge),
        pmAtBackBox: item.pmAtBackBox === '' ? 0 : Number(item.pmAtBackBox),
        pmBeerFridgeBottles: item.pmBeerFridgeBottles === '' ? 0 : Number(item.pmBeerFridgeBottles),
        pmRunningBottleOz: item.pmRunningBottleOz === '' ? 0 : Number(item.pmRunningBottleOz),
        pmAtBarFull: item.pmAtBarFull === '' ? 0 : Number(item.pmAtBarFull),
        sold: item.sold === '' ? 0 : Number(item.sold)
      }));

      await api.saveLiquorCount({
        date: selectedDate,
        amBartender,
        pmBartender,
        items: itemsPayload,
        wasteLogs,
        status: 'submitted'
      });

      setSaveSuccess(`Daily Liquor Count for ${selectedDate} saved successfully!`);
      setTimeout(() => setSaveSuccess(''), 4000);
      
      // Reload variance if manager
      if (isManagerOrAdmin) {
        loadVarianceReport();
      }
    } catch (err) {
      console.error('Error saving count sheet', err);
      setErrorMsg(err.message || 'Failed to save liquor count sheet.');
    } finally {
      setSaving(false);
    }
  };

  // Save Sold Reconciliation
  const handleSaveSold = async () => {
    setErrorMsg('');
    setSaveSuccess('');
    try {
      const soldMap = {};
      Object.entries(soldInputs).forEach(([k, v]) => {
        soldMap[k] = v === '' ? 0 : Number(v);
      });
      await api.saveLiquorSold(selectedDate, soldMap);
      setSaveSuccess('Sales numbers saved and variance recalculated!');
      setTimeout(() => setSaveSuccess(''), 4000);
      loadVarianceReport();
    } catch (err) {
      console.error('Failed to save sold numbers', err);
      setErrorMsg(err.message || 'Failed to save sold numbers.');
    }
  };

  // Add / Edit Catalog Item
  const handleSaveCatalogItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) return;

    try {
      if (editingItem) {
        await api.updateLiquorItem(editingItem._id, newItemForm);
      } else {
        await api.createLiquorItem(newItemForm);
      }
      setNewItemModalOpen(false);
      setEditingItem(null);
      setNewItemForm({
        name: '',
        category: 'liquor',
        boxCount: 24,
        fullWeightOz: 0,
        liquorOz: 25,
        emptyWeightOz: 0
      });
      loadDateData();
    } catch (err) {
      console.error('Failed to save catalog item', err);
      alert(err.message || 'Error saving item.');
    }
  };

  // Group items by category
  const beers = useMemo(() => catalog.filter(i => i.category === 'beer'), [catalog]);
  const liquors = useMemo(() => catalog.filter(i => i.category === 'liquor'), [catalog]);
  const wines = useMemo(() => catalog.filter(i => i.category === 'wine'), [catalog]);

  // Filtered lists if search query is active
  const filteredBeers = useMemo(() => beers.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())), [beers, searchQuery]);
  const filteredLiquors = useMemo(() => liquors.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())), [liquors, searchQuery]);
  const filteredWines = useMemo(() => wines.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())), [wines, searchQuery]);

  // Variance summary statistics
  const varianceSummary = useMemo(() => {
    if (!varianceData?.report) return null;
    let beerDiscrepancies = 0;
    let liquorDiscrepancyOz = 0;
    let wineDiscrepancyOz = 0;
    let totalItemsWithIssues = 0;

    varianceData.report.forEach(r => {
      if (r.category === 'beer') {
        const v = Math.abs(r.variance || 0);
        if (v > 0) {
          beerDiscrepancies += v;
          totalItemsWithIssues++;
        }
      } else if (r.category === 'liquor') {
        const v = Math.abs(r.varianceOz || 0);
        if (v > 0.5) {
          liquorDiscrepancyOz += v;
          totalItemsWithIssues++;
        }
      } else if (r.category === 'wine') {
        const v = Math.abs(r.varianceOz || 0);
        if (v > 0.5) {
          wineDiscrepancyOz += v;
          totalItemsWithIssues++;
        }
      }
    });

    return {
      beerDiscrepancies,
      liquorDiscrepancyOz: liquorDiscrepancyOz.toFixed(1),
      wineDiscrepancyOz: wineDiscrepancyOz.toFixed(1),
      totalItemsWithIssues
    };
  }, [varianceData]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
              <Wine size={26} />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>Daily Liquor Verification</h1>
              <p className="page-subtitle" style={{ margin: 0 }}>
                {isFrontStaff 
                  ? "Front Staff Verification Sheet - Enter AM & PM Bar Counts" 
                  : "Daily Beer, Liquor & Wine Verification Sheet & Manager Variance Reconciliation"}
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector / Lock Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isFrontStaff ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem', 
              background: 'rgba(249, 115, 22, 0.08)', 
              border: '1px solid rgba(249, 115, 22, 0.25)', 
              padding: '0.55rem 1rem', 
              borderRadius: '12px',
              color: '#fff'
            }}>
              <Lock size={16} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Front Staff Lock
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  Today: {selectedDate}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem', 
              background: 'rgba(255, 255, 255, 0.04)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              padding: '0.4rem 0.85rem', 
              borderRadius: '12px' 
            }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Count Date</span>
                <input
                  type="date"
                  className="input-field"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ 
                    padding: '0.1rem 0', 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#fff', 
                    outline: 'none', 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick Refresh */}
          <button
            onClick={loadDateData}
            className="btn btn-secondary"
            title="Refresh Sheet"
            style={{ padding: '0.65rem', borderRadius: '10px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Manager Tab Navigation */}
      {isManagerOrAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
          <button
            onClick={() => setActiveSubTab('staff-sheet')}
            className={`btn ${activeSubTab === 'staff-sheet' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              padding: '0.5rem 1.15rem', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            <ClipboardCheck size={16} />
            Daily Verification Sheet (AM & PM)
          </button>
          
          <button
            onClick={() => setActiveSubTab('variance-report')}
            className={`btn ${activeSubTab === 'variance-report' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              padding: '0.5rem 1.15rem', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            <TrendingDown size={16} />
            Manager Variance Report
            {varianceSummary?.totalItemsWithIssues > 0 && (
              <span className="badge" style={{ background: 'var(--danger)', color: '#fff', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                {varianceSummary.totalItemsWithIssues}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('catalog-specs')}
            className={`btn ${activeSubTab === 'catalog-specs' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              padding: '0.5rem 1.15rem', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            <Sliders size={16} />
            Bottle Catalog & Tare Specs
          </button>
        </div>
      )}

      {/* Alerts / Feedback Banners */}
      {errorMsg && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {saveSuccess && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DAILY VERIFICATION SHEET (Matching Screenshot 1) */}
      {/* ========================================================================= */}
      {activeSubTab === 'staff-sheet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Sheet Header Information Bar */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(249,115,22,0.02) 100%)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
              
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--primary)' }} />
                  {selectedDate}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AM Bartender Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Rasneet / Tasha"
                  value={amBartender}
                  onChange={(e) => setAmBartender(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PM Bartender (Closing) Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Jennifer"
                  value={pmBartender}
                  onChange={(e) => setPmBartender(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={handleSaveSheet}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Daily Sheet'}
                </button>
              </div>

            </div>
          </div>

          {/* Search Bar for Sheet */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Beer size={16} style={{ color: 'var(--primary)' }} />
              <span>Beer & Cans ({filteredBeers.length})</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <Wine size={16} style={{ color: '#ec4899' }} />
              <span>Liquor ({filteredLiquors.length})</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <GlassWater size={16} style={{ color: '#8b5cf6' }} />
              <span>Wine ({filteredWines.length})</span>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search brand name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', height: '38px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)' }}
              />
            </div>
          </div>

          {/* ========================================= */}
          {/* SECTION 1: BEER & CANS */}
          {/* ========================================= */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Beer size={18} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Beer & Cans (Coolers / Energy)</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter loose cans at bar & back box counts</span>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ width: '25%', padding: '0.75rem 1rem' }}>Brand</th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(249, 115, 22, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', color: 'var(--primary)', fontWeight: 700 }}>
                      AM Bartender Count
                    </th>
                    <th style={{ width: '10%', textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)', fontWeight: 700, color: '#60a5fa' }}>
                      Added
                    </th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', color: 'var(--success)', fontWeight: 700 }}>
                      PM Bar Closing Count
                    </th>
                  </tr>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 1rem' }}>Item Name</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Bar Fridge (At Bar)</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>At Back (Box Count)</th>
                    <th style={{ textAlign: 'center' }}>Restocked</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Bar Fridge (At Bar)</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>At Back (Box Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeers.map((item, idx) => {
                    const key = item.name.toLowerCase().trim();
                    const rowData = itemCounts[key] || {};
                    return (
                      <tr key={item._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 400 }}>
                            ({item.boxCount || 24}/box)
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="input-field"
                            value={rowData.amBarFridge ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amBarFridge', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="input-field"
                            value={rowData.amAtBackBox ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amAtBackBox', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.02)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="input-field"
                            value={rowData.added ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'added', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', borderColor: 'rgba(96, 165, 250, 0.3)', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="input-field"
                            value={rowData.pmBarFridge ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmBarFridge', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="input-field"
                            value={rowData.pmAtBackBox ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmAtBackBox', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================= */}
          {/* SECTION 2: LIQUOR BOTTLES */}
          {/* ========================================= */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wine size={18} style={{ color: '#ec4899' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Liquor Bottles (Weighed on Scale)</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Running bottle is scale weight in oz | At Bar is backup full bottle count</span>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ width: '25%', padding: '0.75rem 1rem' }}>Brand</th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(236, 72, 153, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#f472b6', fontWeight: 700 }}>
                      AM Bartender Count
                    </th>
                    <th style={{ width: '10%', textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)', fontWeight: 700, color: '#60a5fa' }}>
                      Added
                    </th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', color: 'var(--success)', fontWeight: 700 }}>
                      PM Bar Closing Count
                    </th>
                  </tr>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 1rem' }}>Item Name</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Running Bottle (oz)</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>At Bar (Full Bottles)</th>
                    <th style={{ textAlign: 'center' }}>Restocked</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Running Bottle (oz)</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>At Bar (Full Bottles)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiquors.map((item, idx) => {
                    const key = item.name.toLowerCase().trim();
                    const rowData = itemCounts[key] || {};
                    return (
                      <tr key={item._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                            Tare: {item.emptyWeightOz} oz | Liq: {item.liquorOz} oz
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="input-field"
                            value={rowData.amRunningBottleOz ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amRunningBottleOz', e.target.value)}
                            style={{ maxWidth: '95px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.amAtBarFull ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amAtBarFull', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.02)' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.added ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'added', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', borderColor: 'rgba(96, 165, 250, 0.3)', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="input-field"
                            value={rowData.pmRunningBottleOz ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmRunningBottleOz', e.target.value)}
                            style={{ maxWidth: '95px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.pmAtBarFull ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmAtBarFull', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================= */}
          {/* SECTION 3: WINE BOTTLES */}
          {/* ========================================= */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GlassWater size={18} style={{ color: '#8b5cf6' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Wine Bottles (Weighed on Scale)</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Running bottle is scale weight in oz | At Bar is backup full bottle count</span>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ width: '25%', padding: '0.75rem 1rem' }}>Brand</th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(139, 92, 246, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#c084fc', fontWeight: 700 }}>
                      AM Bartender Count
                    </th>
                    <th style={{ width: '10%', textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)', fontWeight: 700, color: '#60a5fa' }}>
                      Added
                    </th>
                    <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', color: 'var(--success)', fontWeight: 700 }}>
                      PM Bar Closing Count
                    </th>
                  </tr>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 1rem' }}>Item Name</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Running Bottle (oz)</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>At Bar (Full Bottles)</th>
                    <th style={{ textAlign: 'center' }}>Restocked</th>
                    <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', width: '15%' }}>Running Bottle (oz)</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>At Bar (Full Bottles)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWines.map((item, idx) => {
                    const key = item.name.toLowerCase().trim();
                    const rowData = itemCounts[key] || {};
                    return (
                      <tr key={item._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                            Tare: {item.emptyWeightOz} oz | Capacity: {item.liquorOz} oz
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="input-field"
                            value={rowData.amRunningBottleOz ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amRunningBottleOz', e.target.value)}
                            style={{ maxWidth: '95px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.amAtBarFull ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'amAtBarFull', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.02)' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.added ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'added', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', borderColor: 'rgba(96, 165, 250, 0.3)', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="input-field"
                            value={rowData.pmRunningBottleOz ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmRunningBottleOz', e.target.value)}
                            style={{ maxWidth: '95px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="input-field"
                            value={rowData.pmAtBarFull ?? ''}
                            onChange={(e) => handleItemCountChange(item.name, 'pmAtBarFull', e.target.value)}
                            style={{ maxWidth: '85px', textAlign: 'center', margin: '0 auto', height: '34px', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================= */}
          {/* SECTION 4: LIQUOR AND DRAFT WASTE SHEET */}
          {/* ========================================= */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Liquor and Draft Waste Sheet
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Log broken bottles, draft beer line flush, comps, or spilled drinks
                </p>
              </div>

              <button
                onClick={handleAddWasteRow}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={15} />
                Add Waste Log
              </button>
            </div>

            {wasteLogs.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No waste logged today. Click "+ Add Waste Log" to record spilled draft or broken bottles.
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ width: '15%' }}>Time</th>
                      <th style={{ width: '30%' }}>Item / Brand</th>
                      <th style={{ width: '15%' }}>Amount</th>
                      <th style={{ width: '30%' }}>Description / Reason</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wasteLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. 14:30"
                            value={log.time}
                            onChange={(e) => handleUpdateWasteRow(idx, 'time', e.target.value)}
                            style={{ height: '32px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Bottle or Draft brand"
                            value={log.item}
                            onChange={(e) => handleUpdateWasteRow(idx, 'item', e.target.value)}
                            style={{ height: '32px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              className="input-field"
                              value={log.amount}
                              onChange={(e) => handleUpdateWasteRow(idx, 'amount', e.target.value)}
                              style={{ height: '32px', width: '60px', textAlign: 'center', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                            />
                            <select
                              className="input-field"
                              value={log.unit}
                              onChange={(e) => handleUpdateWasteRow(idx, 'unit', e.target.value)}
                              style={{ height: '32px', padding: '0 0.25rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)' }}
                            >
                              <option value="oz">oz</option>
                              <option value="btl">btl</option>
                              <option value="can">can</option>
                              <option value="pint">pint</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Tap foaming flush / broken glass"
                            value={log.reason}
                            onChange={(e) => handleUpdateWasteRow(idx, 'reason', e.target.value)}
                            style={{ height: '32px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveWasteRow(idx)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem', color: 'var(--danger)', border: 'none', background: 'transparent' }}
                            title="Delete Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Floating Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={handleSaveSheet}
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.65rem' }}
            >
              <Save size={20} />
              {saving ? 'Saving Sheet...' : 'Submit / Save Daily Verification Sheet'}
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANAGER VARIANCE REPORT (Matching Screenshot 2) */}
      {/* ========================================================================= */}
      {activeSubTab === 'variance-report' && isManagerOrAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Beer Variance Total
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: varianceSummary?.beerDiscrepancies > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {varianceSummary?.beerDiscrepancies || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>units</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Reconciled with POS sold
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #ec4899' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Liquor Variance Total
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: Number(varianceSummary?.liquorDiscrepancyOz) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {varianceSummary?.liquorDiscrepancyOz || '0.0'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>oz</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {(Number(varianceSummary?.liquorDiscrepancyOz || 0) / 1.5).toFixed(1)} standard shots discrepancy
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Wine Variance Total
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: Number(varianceSummary?.wineDiscrepancyOz) > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {varianceSummary?.wineDiscrepancyOz || '0.0'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>oz</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {(Number(varianceSummary?.wineDiscrepancyOz || 0) / 6).toFixed(1)} glasses discrepancy
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--info)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Baseline Reference Date
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                {varianceData?.previousDate || 'Previous Day'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Yesterday AM: {varianceData?.prevAmBartender || 'Unrecorded'}
              </div>
            </div>

          </div>

          {/* Variance Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Manager Variance Reconciliation ({selectedDate})
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Comparing Yesterday AM Baseline vs Today AM Bartender Counts & POS Sold Reconciliation
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleSaveSold}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={16} />
                Save POS Sold & Recalculate
              </button>

              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                Print Variance
              </button>
            </div>
          </div>

          {loadingVariance ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }} />
              Loading Variance Calculations...
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* BEER VARIANCE TABLE (Exact match to top half screenshot 2) */}
              {/* ========================================================= */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Beer Variance Reconciliation
                  </h3>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', minWidth: '1200px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ width: '14%', padding: '0.75rem' }}>Brand</th>
                        <th style={{ width: '5%', textAlign: 'center' }}>Box Size</th>
                        <th colSpan="5" style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', color: 'var(--warning)', fontWeight: 700 }}>
                          AM Bar Previous Day (Yesterday)
                        </th>
                        <th colSpan="5" style={{ textAlign: 'center', background: 'rgba(249, 115, 22, 0.08)', borderRight: '1px solid rgba(255,255,255,0.05)', color: 'var(--primary)', fontWeight: 700 }}>
                          AM Bar Today (Current Day)
                        </th>
                        <th style={{ width: '7%', textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontWeight: 700 }}>DIFFERENCE</th>
                        <th style={{ width: '7%', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 700 }}>SOLD</th>
                        <th style={{ width: '7%', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: 700 }}>VARIANCE</th>
                      </tr>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Bottles/Box</th>
                        {/* Yesterday columns */}
                        <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Bar Fridge</th>
                        <th style={{ textAlign: 'center' }}>Fridge Box</th>
                        <th style={{ textAlign: 'center' }}>Fridge Loose</th>
                        <th style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Total Fridge</th>
                        <th style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.05)' }}>Total Yesterday</th>
                        {/* Today columns */}
                        <th style={{ textAlign: 'center' }}>Bar Fridge</th>
                        <th style={{ textAlign: 'center' }}>Fridge Box</th>
                        <th style={{ textAlign: 'center' }}>Fridge Loose</th>
                        <th style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Total Fridge</th>
                        <th style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.05)' }}>Total Today</th>
                        {/* Difference & Sold & Variance */}
                        <th style={{ textAlign: 'center' }}>M - G</th>
                        <th style={{ textAlign: 'center' }}>POS Units</th>
                        <th style={{ textAlign: 'center' }}>Discrepancy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(varianceData?.report || []).filter(r => r.category === 'beer').map((row, idx) => {
                        const key = row.name.toLowerCase().trim();
                        const soldVal = soldInputs[key] ?? '';
                        const soldNum = soldVal === '' ? 0 : Number(soldVal);
                        // Variance calculation: diff is negative for consumption. E.g. diff -5, sold 5 => variance = 0
                        const varianceCalculated = (row.difference * -1) - soldNum;

                        return (
                          <tr key={row.itemId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{row.name}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.boxCount}</td>
                            
                            {/* Yesterday */}
                            <td style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>{row.previous.barFridge || 0}</td>
                            <td style={{ textAlign: 'center' }}>{row.previous.beerFridgeBox || 0}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.previous.beerFridgeBottles || 0}</td>
                            <td style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', fontWeight: 600 }}>{row.previous.totalBeerFridge || 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.04)', color: 'var(--warning)' }}>{row.previous.totalCount || 0}</td>

                            {/* Today */}
                            <td style={{ textAlign: 'center' }}>{row.today.barFridge || 0}</td>
                            <td style={{ textAlign: 'center' }}>{row.today.beerFridgeBox || 0}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.today.beerFridgeBottles || 0}</td>
                            <td style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', fontWeight: 600 }}>{row.today.totalBeerFridge || 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.04)', color: 'var(--primary)' }}>{row.today.totalCount || 0}</td>

                            {/* Reconciliation */}
                            <td style={{ textAlign: 'center', fontWeight: 700, color: row.difference < 0 ? '#fb923c' : '#38bdf8' }}>
                              {row.difference > 0 ? `+${row.difference}` : row.difference}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                className="input-field"
                                value={soldVal}
                                onChange={(e) => setSoldInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                style={{ maxWidth: '65px', textAlign: 'center', margin: '0 auto', height: '28px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: varianceCalculated > 0 ? 'var(--danger)' : (varianceCalculated < 0 ? 'var(--info)' : 'var(--success)') }}>
                              {varianceCalculated === 0 ? (
                                <span style={{ color: 'var(--success)' }}>0 (Match)</span>
                              ) : (
                                <span>{varianceCalculated > 0 ? `-${varianceCalculated} Short` : `+${Math.abs(varianceCalculated)} Excess`}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================================= */}
              {/* LIQUOR & WINE VARIANCE TABLE (Exact match to bottom half screenshot 2) */}
              {/* ========================================================= */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Liquor & Wine Variance Reconciliation (Fluid Ounces)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Net Oz = Running Gross - Tare Weight | Full Oz = Backup Count &times; Bottle Capacity
                  </span>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', minWidth: '1350px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ width: '15%', padding: '0.75rem' }}>Brand</th>
                        <th style={{ width: '6%', textAlign: 'center' }}>Tare (Empty)</th>
                        <th colSpan="5" style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', color: 'var(--warning)', fontWeight: 700 }}>
                          Previous Day (Yesterday Baseline)
                        </th>
                        <th colSpan="5" style={{ textAlign: 'center', background: 'rgba(236, 72, 153, 0.08)', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#f472b6', fontWeight: 700 }}>
                          Current Day (Today AM Count)
                        </th>
                        <th style={{ width: '7%', textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontWeight: 700 }}>USED (oz)</th>
                        <th style={{ width: '7%', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 700 }}>SOLD (oz)</th>
                        <th style={{ width: '8%', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: 700 }}>VARIANCE (oz)</th>
                      </tr>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Empty Tare</th>
                        {/* Yesterday */}
                        <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Gross Oz</th>
                        <th style={{ textAlign: 'center' }}>Net Liq Oz</th>
                        <th style={{ textAlign: 'center' }}>Backup Full</th>
                        <th style={{ textAlign: 'center' }}>Backup Oz</th>
                        <th style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.05)' }}>Total Prev Oz</th>
                        {/* Today */}
                        <th style={{ textAlign: 'center' }}>Gross Oz</th>
                        <th style={{ textAlign: 'center' }}>Net Liq Oz</th>
                        <th style={{ textAlign: 'center' }}>Backup Full</th>
                        <th style={{ textAlign: 'center' }}>Backup Oz</th>
                        <th style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.05)' }}>Total Today Oz</th>
                        {/* Diff & Sold & Variance */}
                        <th style={{ textAlign: 'center' }}>Prev - Today</th>
                        <th style={{ textAlign: 'center' }}>POS Sold Oz</th>
                        <th style={{ textAlign: 'center' }}>Discrepancy Oz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(varianceData?.report || []).filter(r => r.category === 'liquor' || r.category === 'wine').map((row, idx) => {
                        const key = row.name.toLowerCase().trim();
                        const soldVal = soldInputs[key] ?? '';
                        const soldNum = soldVal === '' ? 0 : Number(soldVal);
                        // Variance oz = Sold oz - Used oz
                        const varianceCalculated = +(soldNum - (row.differenceOz || 0)).toFixed(2);

                        return (
                          <tr key={row.itemId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>
                              {row.name}
                              <span className="badge" style={{ fontSize: '0.65rem', marginLeft: '0.4rem', background: row.category === 'wine' ? 'rgba(139,92,246,0.15)' : 'rgba(236,72,153,0.15)', color: row.category === 'wine' ? '#c084fc' : '#f472b6' }}>
                                {row.category}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.specs?.emptyWeightOz || 0}</td>

                            {/* Yesterday */}
                            <td style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>{row.previous.grossRunningOz || 0}</td>
                            <td style={{ textAlign: 'center', color: '#fcd34d' }}>{row.previous.netRunningOz || 0}</td>
                            <td style={{ textAlign: 'center' }}>{row.previous.backupFullCount || 0}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.previous.backupWeightOz || 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.04)', color: 'var(--warning)' }}>{row.previous.totalOz || 0}</td>

                            {/* Today */}
                            <td style={{ textAlign: 'center' }}>{row.today.grossRunningOz || 0}</td>
                            <td style={{ textAlign: 'center', color: '#f472b6' }}>{row.today.netRunningOz || 0}</td>
                            <td style={{ textAlign: 'center' }}>{row.today.backupFullCount || 0}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.today.backupWeightOz || 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.04)', color: '#ec4899' }}>{row.today.totalOz || 0}</td>

                            {/* Difference & Sold & Variance */}
                            <td style={{ textAlign: 'center', fontWeight: 700, color: row.differenceOz > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                              {row.differenceOz || 0} oz
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                className="input-field"
                                value={soldVal}
                                onChange={(e) => setSoldInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                style={{ maxWidth: '65px', textAlign: 'center', margin: '0 auto', height: '28px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: varianceCalculated < -0.5 ? 'var(--danger)' : (varianceCalculated > 0.5 ? 'var(--info)' : 'var(--success)') }}>
                              {Math.abs(varianceCalculated) <= 0.5 ? (
                                <span style={{ color: 'var(--success)' }}>Balanced</span>
                              ) : (
                                <span>{varianceCalculated < 0 ? `${varianceCalculated} oz (Overpour)` : `+${varianceCalculated} oz`}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BOTTLE CATALOG & TARE SPECS (Manager only) */}
      {/* ========================================================================= */}
      {activeSubTab === 'catalog-specs' && isManagerOrAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Bottle Catalog & Tare Weight Configurations
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Configure empty bottle tare weights, full weights, liquor capacity, and case packaging sizes.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setNewItemForm({
                  name: '',
                  category: 'liquor',
                  boxCount: 24,
                  fullWeightOz: 0,
                  liquorOz: 25,
                  emptyWeightOz: 0
                });
                setNewItemModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              Add New Liquor / Beer
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.4)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ width: '25%' }}>Brand Name</th>
                    <th style={{ width: '15%' }}>Category</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Box Size</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Full Weight (oz)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Capacity (oz)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Tare Weight (oz)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((item) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span className="badge" style={{ 
                          textTransform: 'uppercase', 
                          fontSize: '0.7rem',
                          background: item.category === 'beer' ? 'rgba(249,115,22,0.1)' : (item.category === 'wine' ? 'rgba(139,92,246,0.1)' : 'rgba(236,72,153,0.1)'),
                          color: item.category === 'beer' ? 'var(--primary)' : (item.category === 'wine' ? '#c084fc' : '#f472b6')
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.boxCount || 1} / box</td>
                      <td style={{ textAlign: 'center' }}>{item.fullWeightOz ? `${item.fullWeightOz} oz` : '-'}</td>
                      <td style={{ textAlign: 'center' }}>{item.liquorOz ? `${item.liquorOz} oz` : '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--warning)' }}>
                        {item.emptyWeightOz ? `${item.emptyWeightOz} oz` : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setNewItemForm({
                              name: item.name,
                              category: item.category,
                              boxCount: item.boxCount || 24,
                              fullWeightOz: item.fullWeightOz || 0,
                              liquorOz: item.liquorOz || 25,
                              emptyWeightOz: item.emptyWeightOz || 0
                            });
                            setNewItemModalOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={13} />
                          Edit Specs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT CATALOG ITEM MODAL */}
      {/* ========================================================================= */}
      {newItemModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', border: 'var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>
              {editingItem ? `Edit Specs: ${editingItem.name}` : 'Add New Liquor / Beer Brand'}
            </h2>

            <form onSubmit={handleSaveCatalogItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Brand Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Captain Morgan Spiced Rum 1.14L"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category</label>
                <select
                  className="input-field"
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="beer">Beer & Coolers</option>
                  <option value="liquor">Liquor Bottle</option>
                  <option value="wine">Wine Bottle</option>
                </select>
              </div>

              {newItemForm.category === 'beer' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bottles / Cans in a Box</label>
                  <input
                    type="number"
                    className="input-field"
                    value={newItemForm.boxCount}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, boxCount: Number(e.target.value) }))}
                    placeholder="24"
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Bottle Gross (oz)</label>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      value={newItemForm.fullWeightOz}
                      onChange={(e) => {
                        const full = Number(e.target.value);
                        setNewItemForm(prev => ({
                          ...prev,
                          fullWeightOz: full,
                          emptyWeightOz: +(Math.max(0, full - prev.liquorOz)).toFixed(2)
                        }));
                      }}
                      placeholder="e.g. 53"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Liquor Capacity (oz)</label>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      value={newItemForm.liquorOz}
                      onChange={(e) => {
                        const liq = Number(e.target.value);
                        setNewItemForm(prev => ({
                          ...prev,
                          liquorOz: liq,
                          emptyWeightOz: +(Math.max(0, prev.fullWeightOz - liq)).toFixed(2)
                        }));
                      }}
                      placeholder="25 or 38.5"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                    <label className="form-label">Empty Tare Weight (oz)</label>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      value={newItemForm.emptyWeightOz}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, emptyWeightOz: Number(e.target.value) }))}
                      placeholder="Auto-calculated (Full - Capacity)"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Tare weight is subtracted from running scale reading to get actual liquor remaining.
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setNewItemModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Item Specs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
