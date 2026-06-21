import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Clipboard, Upload, CheckCircle2, ChevronRight, AlertCircle, 
  RefreshCw, Trash2, Search, ChevronLeft, FileSpreadsheet, Calendar 
} from 'lucide-react';

export default function DayInventoryCount({ rawItems, completedSessions, onRefreshAll }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [session, setSession] = useState(null);
  // Count States
  const [actualCounts, setActualCounts] = useState({});
  const [endBoxesInput, setEndBoxesInput] = useState({});
  const [endLooseInput, setEndLooseInput] = useState({});
  const [searchQueryEnd, setSearchQueryEnd] = useState('');
  const [currentPageEnd, setCurrentPageEnd] = useState(1);
  const [uploadFeedbackEnd, setUploadFeedbackEnd] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const itemsPerPage = 25;

  const loadSession = async () => {
    if (!selectedDate) return;
    try {
      setSessionLoading(true);
      setError('');
      setSuccess('');
      setUploadFeedbackEnd(null);
      const data = await api.getSessionByDate(selectedDate);
      setSession(data);
      
      const actMap = {};
      const actBoxes = {};
      const actLoose = {};

      rawItems.forEach(item => {
        actMap[item._id] = 0;
      });

      if (data) {
        // Fallback to initialInventory if actualFinalInventory is not populated yet
        const inventoryToUse = (data.actualFinalInventory && data.actualFinalInventory.length > 0)
          ? data.actualFinalInventory 
          : (data.initialInventory && data.initialInventory.length > 0 ? data.initialInventory : null);

        if (inventoryToUse) {
          inventoryToUse.forEach(item => {
            if (!item.rawItemId) return;
            const id = item.rawItemId._id || item.rawItemId;
            if (!id) return;
            const qty = item.quantity;
            actMap[id] = qty;
            const rItem = rawItems.find(r => r._id === id.toString());
            if (rItem && rItem.quantityPerBox > 0) {
              const b = Math.floor(qty / rItem.quantityPerBox);
              const l = qty % rItem.quantityPerBox;
              actBoxes[id] = b === 0 ? '' : String(b);
              actLoose[id] = l === 0 ? '' : String(l);
            }
          });
        }
      }
      
      setActualCounts(actMap);
      setEndBoxesInput(actBoxes);
      setEndLooseInput(actLoose);
    } catch (err) {
      console.error('Failed to load session for date', err);
      setError('Failed to retrieve inventory counts for selected date.');
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [selectedDate, rawItems]);

  const handleEndBoxesChange = (itemId, val, qtyPerBox) => {
    const newBoxes = { ...endBoxesInput, [itemId]: val };
    setEndBoxesInput(newBoxes);

    const boxes = Number(val) || 0;
    const loose = Number(endLooseInput[itemId]) || 0;
    const total = (boxes * qtyPerBox) + loose;

    setActualCounts(prev => ({
      ...prev,
      [itemId]: total
    }));
  };

  const handleEndLooseChange = (itemId, val, qtyPerBox) => {
    const newLoose = { ...endLooseInput, [itemId]: val };
    setEndLooseInput(newLoose);

    const boxes = Number(endBoxesInput[itemId]) || 0;
    const loose = Number(val) || 0;
    const total = (boxes * qtyPerBox) + loose;

    setActualCounts(prev => ({
      ...prev,
      [itemId]: total
    }));
  };

  const handleLoadLastCounts = () => {
    if (completedSessions.length === 0) {
      setError('No historical sessions found to load data from.');
      return;
    }
    const lastSession = completedSessions[0];
    const counts = { ...actualCounts };
    const newBoxes = { ...endBoxesInput };
    const newLoose = { ...endLooseInput };

    const inventoryToUse = (lastSession.actualFinalInventory && lastSession.actualFinalInventory.length > 0)
      ? lastSession.actualFinalInventory
      : (lastSession.initialInventory && lastSession.initialInventory.length > 0 ? lastSession.initialInventory : []);

    inventoryToUse.forEach(item => {
      if (!item.rawItemId) return;
      const id = item.rawItemId._id || item.rawItemId;
      if (id) {
        const qty = item.quantity || 0;
        counts[id] = qty;
        const rItem = rawItems.find(r => r._id === id.toString());
        if (rItem && rItem.quantityPerBox > 0) {
          const b = Math.floor(qty / rItem.quantityPerBox);
          const l = qty % rItem.quantityPerBox;
          newBoxes[id] = b === 0 ? '' : String(b);
          newLoose[id] = l === 0 ? '' : String(l);
        } else if (rItem) {
          newBoxes[id] = '';
          newLoose[id] = '';
        }
      }
    });
    setActualCounts(counts);
    setEndBoxesInput(newBoxes);
    setEndLooseInput(newLoose);
    setError('');
  };

  const handleFinalCountCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setError('');
    setUploadFeedbackEnd(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.uploadEndCount(formData);
      
      const newCounts = { ...actualCounts };
      const newBoxes = { ...endBoxesInput };
      const newLoose = { ...endLooseInput };
      Object.keys(result.countsMap).forEach(id => {
        const qty = result.countsMap[id];
        newCounts[id] = qty;
        const rItem = rawItems.find(r => r._id === id);
        if (rItem && rItem.quantityPerBox > 0) {
          const b = Math.floor(qty / rItem.quantityPerBox);
          const l = qty % rItem.quantityPerBox;
          newBoxes[id] = b === 0 ? '' : String(b);
          newLoose[id] = l === 0 ? '' : String(l);
        } else if (rItem) {
          newBoxes[id] = '';
          newLoose[id] = '';
        }
      });
      setActualCounts(newCounts);
      setEndBoxesInput(newBoxes);
      setEndLooseInput(newLoose);

      setUploadFeedbackEnd({
        message: `Loaded ${result.matchedCount} count(s) from CSV. Click Save below to store.`,
        unmatchedCount: result.unmatchedCount,
        unmatched: result.unmatched
      });
    } catch (err) {
      setError(err.message || 'Failed to upload CSV file');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveFinal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const actualArray = Object.keys(actualCounts).map(id => ({
      rawItemId: id,
      quantity: Number(actualCounts[id]) || 0
    }));

    try {
      const updated = await api.saveFinalCounts(selectedDate, actualArray);
      setSession(updated);
      setSuccess('Daily stock counts saved successfully!');
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to save daily stock counts.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and Paginate list
  const filteredEndItems = rawItems.filter(item =>
    item.name.toLowerCase().includes(searchQueryEnd.toLowerCase())
  );
  const totalPagesEnd = Math.ceil(filteredEndItems.length / itemsPerPage) || 1;
  const activePageEnd = Math.min(currentPageEnd, totalPagesEnd);
  const startIndexEnd = (activePageEnd - 1) * itemsPerPage;
  const paginatedEndItems = filteredEndItems.slice(startIndexEnd, startIndexEnd + itemsPerPage);

  return (
    <div className="day-count-page animate-fade-in">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Day Inventory Count</h1>
          <p className="page-subtitle">Record daily stock counts for ingredients by date</p>
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

      <div className="card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 className="form-label" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Enter Daily Stock</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Input actual stock levels for {selectedDate}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {completedSessions.length > 0 && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} 
                onClick={handleLoadLastCounts}
              >
                <RefreshCw size={15} /> Load last counts
              </button>
            )}
            
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--primary-glow)' }}
              onClick={() => document.getElementById('end-csv-input').click()}
            >
              <FileSpreadsheet size={15} style={{ color: 'var(--primary)' }} /> Upload CSV
            </button>
            <input
              id="end-csv-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFinalCountCsvUpload}
            />
          </div>
        </div>

        {uploadFeedbackEnd && (
          <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#fff', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
              {uploadFeedbackEnd.message}
            </div>
            {uploadFeedbackEnd.unmatchedCount > 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠️ {uploadFeedbackEnd.unmatchedCount} item(s) in CSV could not be matched by name. Unmatched sample: {uploadFeedbackEnd.unmatched.join(', ')}
              </div>
            )}
          </div>
        )}

        {rawItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' }}>
            Please add raw ingredients in the **Ingredients** page first.
          </p>
        ) : sessionLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Loading counts for {selectedDate}...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <form onSubmit={handleSaveFinal}>
            <div className="search-container" style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={18} />
              <input
                type="text"
                placeholder="Search ingredients..."
                className="input-field"
                value={searchQueryEnd}
                onChange={(e) => { setSearchQueryEnd(e.target.value); setCurrentPageEnd(1); }}
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>

            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Unit</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Boxes</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Buffer Pcs</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Total Count</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEndItems.map(item => {
                    const hasBoxConfig = item.quantityPerBox > 0;
                    return (
                      <tr key={item._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {item.unit}
                          </span>
                        </td>
                        <td data-label="Boxes" style={{ textAlign: 'center' }}>
                          {hasBoxConfig ? (
                            <input
                              type="number"
                              min="0"
                              className="input-field"
                              value={endBoxesInput[item._id] ?? ''}
                              onChange={(e) => handleEndBoxesChange(item._id, e.target.value, item.quantityPerBox)}
                              placeholder="0"
                              style={{ width: '80px', margin: '0 auto', textAlign: 'center' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td data-label="Buffer Pcs" style={{ textAlign: 'center' }}>
                          {hasBoxConfig ? (
                            <input
                              type="number"
                              min="0"
                              className="input-field"
                              value={endLooseInput[item._id] ?? ''}
                              onChange={(e) => handleEndLooseChange(item._id, e.target.value, item.quantityPerBox)}
                              placeholder="0"
                              style={{ width: '80px', margin: '0 auto', textAlign: 'center' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td data-label="Total Count">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="input-field"
                            value={actualCounts[item._id] ?? ''}
                            readOnly={hasBoxConfig}
                            onChange={(e) => !hasBoxConfig && setActualCounts({
                              ...actualCounts,
                              [item._id]: e.target.value
                            })}
                            style={{ 
                              textAlign: 'right', 
                              fontWeight: 600,
                              background: hasBoxConfig ? 'rgba(255,255,255,0.02)' : '',
                              color: hasBoxConfig ? 'var(--primary)' : ''
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPagesEnd > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Showing {startIndexEnd + 1} - {Math.min(startIndexEnd + itemsPerPage, filteredEndItems.length)} of {filteredEndItems.length} ingredients
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={activePageEnd === 1}
                    onClick={() => setCurrentPageEnd(activePageEnd - 1)}
                  >
                    Prev
                  </button>
                  <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                    Page {activePageEnd} of {totalPagesEnd}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={activePageEnd === totalPagesEnd}
                    onClick={() => setCurrentPageEnd(activePageEnd + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--secondary-gradient)' }} disabled={loading}>
              {loading ? 'Saving Stock Counts...' : 'Save Stock Counts'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
