import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Upload, CheckCircle2, AlertCircle, Calendar, Table, Plus, Trash2, Search } from 'lucide-react';

export default function DayEndSales({ recipes = [], onRefreshAll }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [session, setSession] = useState(null);
  const [salesEntries, setSalesEntries] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Autocomplete Search state per row
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isModified, setIsModified] = useState(false);

  const loadSession = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const data = await api.getSessionByDate(selectedDate);
      setSession(data);
    } catch (err) {
      console.error('Failed to load session for date', err);
      setError('Failed to retrieve session data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [selectedDate]);

  useEffect(() => {
    if (session && session.salesData) {
      setSalesEntries(session.salesData.map(item => ({
        sku: item.sku || '',
        name: item.name || '',
        quantitySold: item.quantitySold,
        price: item.price,
        _id: item._id || Math.random().toString(),
        isEditingProduct: false
      })));
    } else {
      setSalesEntries([]);
    }
  }, [session]);

  // Track modification status
  useEffect(() => {
    if (!session) {
      setIsModified(salesEntries.length > 0);
      return;
    }
    const currentSales = session.salesData || [];
    if (salesEntries.length !== currentSales.length) {
      setIsModified(true);
      return;
    }
    const different = salesEntries.some((local, idx) => {
      const db = currentSales[idx];
      if (!db) return true;
      return (
        local.sku !== db.sku ||
        local.name !== db.name ||
        local.quantitySold !== db.quantitySold ||
        local.price !== db.price
      );
    });
    setIsModified(different);
  }, [salesEntries, session]);

  // Autocomplete POS Product Search
  useEffect(() => {
    if (activeSearchId === null) {
      setSuggestions([]);
      return;
    }
    if (queryText.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const results = await api.searchMenuItems(queryText);
        setSuggestions(results);
      } catch (err) {
        console.error('Failed to search menu items', err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [queryText, activeSearchId]);

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handleUploadSales = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a POS sales CSV file to upload.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const updated = await api.uploadSales(selectedDate, formData);
      setSession(updated);
      setUploadFile(null);
      setSuccess(`POS Sales report "${updated.salesFile}" processed successfully!`);
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to process sales report.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    const newId = 'temp-' + Date.now() + '-' + Math.random();
    setSalesEntries([
      ...salesEntries,
      {
        sku: '',
        name: '',
        quantitySold: 1,
        price: 0,
        _id: newId,
        isEditingProduct: true
      }
    ]);
    setActiveSearchId(newId);
    setQueryText('');
    setSuggestions([]);
  };

  const handleDeleteRow = (id) => {
    setSalesEntries(prev => prev.filter(entry => entry._id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setSalesEntries(prev => prev.map(entry => {
      if (entry._id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const handleStartEditingProduct = (entry) => {
    setActiveSearchId(entry._id);
    setQueryText(entry.name);
    setSalesEntries(prev => prev.map(e => {
      if (e._id === entry._id) {
        return { ...e, isEditingProduct: true };
      }
      return { ...e, isEditingProduct: false };
    }));
  };

  const handleInputBlur = (entry) => {
    setTimeout(() => {
      setSalesEntries(prev => prev.map(e => {
        if (e._id === entry._id) {
          return { ...e, isEditingProduct: false };
        }
        return e;
      }));
      setActiveSearchId(null);
    }, 200);
  };

  const handleSelectProduct = (rowId, product) => {
    setSalesEntries(prev => prev.map(entry => {
      if (entry._id === rowId) {
        return {
          ...entry,
          sku: product.item_sku_code,
          name: product.name,
          isEditingProduct: false
        };
      }
      return entry;
    }));
    setActiveSearchId(null);
    setQueryText('');
    setSuggestions([]);
  };

  const handleKeyDown = (e, entry) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const list = getMergedSuggestions();
      if (list.length > 0) {
        handleSelectProduct(entry._id, list[0]);
      } else if (queryText.trim()) {
        handleSelectProduct(entry._id, {
          item_sku_code: 'MANUAL-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          name: queryText.trim()
        });
      }
    } else if (e.key === 'Escape') {
      setActiveSearchId(null);
      setSalesEntries(prev => prev.map(item => {
        if (item._id === entry._id) {
          return { ...item, isEditingProduct: false };
        }
        return item;
      }));
    }
  };

  const handleSaveSales = async () => {
    const invalid = salesEntries.some(entry => !entry.sku);
    if (invalid) {
      setError('Please select a valid menu product for all sales rows.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const filename = session?.salesFile || 'Manually Entered';
      const formattedSales = salesEntries.map(entry => ({
        sku: entry.sku,
        name: entry.name,
        quantitySold: parseInt(entry.quantitySold, 10) || 0,
        price: parseFloat(entry.price) || 0
      }));
      const updated = await api.saveSalesData(selectedDate, formattedSales, filename);
      setSession(updated);
      setSuccess('Sales log saved successfully!');
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to save sales data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    if (session && session.salesData) {
      setSalesEntries(session.salesData.map(item => ({
        sku: item.sku || '',
        name: item.name || '',
        quantitySold: item.quantitySold,
        price: item.price,
        _id: item._id || Math.random().toString(),
        isEditingProduct: false
      })));
    } else {
      setSalesEntries([]);
    }
    setError('');
    setSuccess('');
  };

  const getMergedSuggestions = () => {
    const list = [];
    
    // If empty queryText, show all recipes
    if (!queryText.trim()) {
      recipes.forEach(r => {
        list.push({
          _id: r._id,
          item_sku_code: r.menuItemSku,
          name: r.menuItemName,
          hasRecipe: true
        });
      });
      return list.slice(0, 15);
    }

    // Match recipes
    const filteredRecipes = recipes.filter(r => 
      r.menuItemName.toLowerCase().includes(queryText.toLowerCase()) ||
      r.menuItemSku.toLowerCase().includes(queryText.toLowerCase())
    );
    filteredRecipes.forEach(r => {
      list.push({
        _id: r._id,
        item_sku_code: r.menuItemSku,
        name: r.menuItemName,
        hasRecipe: true
      });
    });

    // Match suggestions from backend search
    suggestions.forEach(s => {
      if (!list.some(item => item.item_sku_code === s.item_sku_code)) {
        list.push({
          _id: s._id,
          item_sku_code: s.item_sku_code,
          name: s.name,
          hasRecipe: false
        });
      }
    });

    return list;
  };

  const hasSales = session && session.salesFile && session.salesData && session.salesData.length > 0;

  return (
    <div className="day-end-sales-page animate-fade-in" style={{ overflow: 'visible' }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Day End Sales</h1>
          <p className="page-subtitle">Upload POS reports to compute recipe ingredient depletion quantities</p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(18,20,26,0.5)', padding: '0.5rem 1rem', borderRadius: '12px', border: 'var(--glass-border)' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date Context:</span>
          <input
            type="date"
            className="input-field"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            style={{ width: '150px', padding: '0.25rem 0.5rem', border: 'none', background: 'transparent', color: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Top Grid: Upload Control & Ingredient Depletion Calculations */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        
        {/* Upload Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Upload POS Sales Report</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Import day-end sales CSV for {selectedDate}</p>
          </div>

          <form onSubmit={handleUploadSales}>
            <div 
              className="upload-dropzone" 
              onClick={() => document.getElementById('sales-file-input-page').click()}
            >
              <Upload className="upload-icon" style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {uploadFile ? uploadFile.name : 'Select POS Sales CSV'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Supports standard items and modifier SKUs exports
              </p>
              <input
                id="sales-file-input-page"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem' }} 
              disabled={loading || !uploadFile}
            >
              {loading ? 'Uploading & Computing...' : 'Process POS Sales File'}
            </button>
          </form>
        </div>

        {/* Display Usage Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Computed Ingredient Depletion</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Quantities deducted from inventory based on portions and sold items</p>
          </div>

          {!hasSales ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
              <Table size={36} />
              <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Please record or upload POS sales report to view ingredient depletion.</p>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th style={{ textAlign: 'right' }}>Quantity Depleted</th>
                  </tr>
                </thead>
                <tbody>
                  {session.calculatedUsage && session.calculatedUsage.length > 0 ? (
                    session.calculatedUsage.filter(u => u.quantity > 0).map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.rawItemId?.name || 'Unknown'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {u.quantity.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{u.rawItemId?.unit}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No raw items were depleted (verify recipes are set up).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* POS Sales Entries Grid Card (Full Width for Roomy Column Space) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>POS Sales Log / Manual Entry</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {session?.salesFile ? `Source: ${session.salesFile}` : 'No sales logs loaded'}
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleAddRow}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Plus size={15} /> Add Item
          </button>
        </div>

        {salesEntries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
            <Table size={36} />
            <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
              No sales logged for {selectedDate}. Click "Add Item" above or upload a CSV report.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ overflow: 'visible' }}>
            <table className="custom-table" style={{ overflow: 'visible' }}>
              <thead>
                <tr>
                  <th>Menu Product</th>
                  <th style={{ width: '180px' }}>SKU</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Qty Sold</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Price ($)</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody style={{ overflow: 'visible' }}>
                {salesEntries.map((entry) => (
                  <tr key={entry._id} style={{ overflow: 'visible' }}>
                    {/* Menu Product */}
                    <td style={{ position: 'relative', overflow: 'visible' }}>
                      {entry.isEditingProduct ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Type menu item..."
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
                            onBlur={() => handleInputBlur(entry)}
                            onKeyDown={(e) => handleKeyDown(e, entry)}
                            autoFocus
                            style={{ 
                              paddingLeft: '1.8rem', 
                              paddingRight: '0.5rem', 
                              width: '100%', 
                              height: '34px', 
                              fontSize: '0.85rem',
                              border: '1px solid var(--primary)',
                              background: 'rgba(0,0,0,0.3)'
                            }}
                          />
                          <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                          
                          {/* Suggestions Dropdown */}
                          {activeSearchId === entry._id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 1000,
                              background: '#12141c',
                              border: 'var(--glass-border)',
                              borderRadius: '8px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                              marginTop: '4px',
                              maxHeight: '200px',
                              overflowY: 'auto'
                            }}>
                              {getMergedSuggestions().length > 0 ? (
                                getMergedSuggestions().map((item) => (
                                  <div
                                    key={item._id || item.item_sku_code}
                                    onMouseDown={() => handleSelectProduct(entry._id, item)}
                                    style={{
                                      padding: '0.6rem 0.8rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                                      textAlign: 'left',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{item.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {item.item_sku_code}</div>
                                    </div>
                                    {item.hasRecipe && (
                                      <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.12)', color: 'var(--primary)', border: '1px solid rgba(249, 115, 22, 0.2)', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                        Recipe
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  No products found. Press Enter to use custom item.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleStartEditingProduct(entry)}
                          style={{ 
                            cursor: 'pointer', 
                            fontWeight: 600, 
                            minHeight: '34px', 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid transparent',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          {entry.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Search/Select Menu Product...</span>}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', verticalAlign: 'middle' }}>
                      {entry.sku || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not mapped</span>}
                    </td>

                    {/* Quantity Sold */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={entry.quantitySold === undefined ? '' : entry.quantitySold}
                        onChange={(e) => handleRowChange(entry._id, 'quantitySold', e.target.value)}
                        style={{ 
                          textAlign: 'center', 
                          height: '34px', 
                          fontSize: '0.85rem', 
                          width: '90px', 
                          margin: '0 auto', 
                          background: 'rgba(0,0,0,0.2)', 
                          border: '1px solid rgba(255,255,255,0.08)' 
                        }}
                      />
                    </td>

                    {/* Price */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={entry.price === undefined ? '' : entry.price}
                        onChange={(e) => handleRowChange(entry._id, 'price', e.target.value)}
                        style={{ 
                          textAlign: 'center', 
                          height: '34px', 
                          fontSize: '0.85rem', 
                          width: '100px', 
                          margin: '0 auto', 
                          background: 'rgba(0,0,0,0.2)', 
                          border: '1px solid rgba(255,255,255,0.08)' 
                        }}
                      />
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDeleteRow(entry._id)}
                        style={{ color: 'var(--danger)', padding: '0.45rem', borderColor: 'transparent', background: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Save / Discard Controls */}
        {isModified && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', animation: 'animate-fade-in 0.2s', width: '320px', alignSelf: 'flex-start' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveSales}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Saving...' : 'Save Sales Entries'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDiscardChanges}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
