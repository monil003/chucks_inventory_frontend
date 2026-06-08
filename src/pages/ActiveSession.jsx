import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Clipboard, Upload, CheckCircle2, ChevronRight, AlertCircle, 
  RefreshCw, Trash2, Search, ChevronLeft, FileSpreadsheet, Eye 
} from 'lucide-react';

export default function ActiveSession({ activeSession, completedSessions, rawItems, refreshSession, refreshHistory }) {
  // States
  const [initialCounts, setInitialCounts] = useState({}); // { rawItemId: quantity }
  const [actualCounts, setActualCounts] = useState({}); // { rawItemId: quantity }
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Search and Pagination states for Day Start
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Search and Pagination states for Day End
  const [searchQueryEnd, setSearchQueryEnd] = useState('');
  const [currentPageEnd, setCurrentPageEnd] = useState(1);

  // File upload feedback
  const [uploadFeedback, setUploadFeedback] = useState(null);

  // Initialize count state
  useEffect(() => {
    if (activeSession) {
      // Pre-fill actual counts if they exist, or default to 0
      const counts = {};
      activeSession.actualFinalInventory.forEach(item => {
        counts[item.rawItemId._id || item.rawItemId] = item.quantity || 0;
      });
      setActualCounts(counts);
    } else {
      // Default initial counts to 0 for all raw items
      const counts = {};
      rawItems.forEach(item => {
        counts[item._id] = 0;
      });
      setInitialCounts(counts);
    }
    setError('');
  }, [activeSession, rawItems]);

  // Load last session's final count to pre-fill initial inventory
  const handleLoadLastCounts = () => {
    if (completedSessions.length === 0) {
      setError('No historical sessions found to load data from.');
      return;
    }
    const lastSession = completedSessions[0];
    const counts = { ...initialCounts };
    lastSession.actualFinalInventory.forEach(item => {
      const id = item.rawItemId._id || item.rawItemId;
      if (id) {
        counts[id] = item.quantity || 0;
      }
    });
    setInitialCounts(counts);
    setError('');
  };

  const handleInitialCountCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setError('');
    setUploadFeedback(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.uploadInitialCount(formData);
      
      // Update initial counts state with matched values
      const newCounts = { ...initialCounts };
      Object.keys(result.countsMap).forEach(id => {
        newCounts[id] = result.countsMap[id];
      });
      setInitialCounts(newCounts);

      setUploadFeedback({
        message: `Successfully loaded ${result.matchedCount} count(s) from CSV.`,
        unmatchedCount: result.unmatchedCount,
        unmatched: result.unmatched
      });
    } catch (err) {
      setError(err.message || 'Failed to upload initial count file');
    } finally {
      setLoading(false);
      // Reset input value to allow uploading the same file again
      e.target.value = '';
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const initialArray = Object.keys(initialCounts).map(id => ({
      rawItemId: id,
      quantity: Number(initialCounts[id]) || 0
    }));

    try {
      await api.startSession(initialArray);
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Failed to start inventory session');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    setError('');
  };

  const handleUploadSales = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a POS sales CSV file to upload.');
      return;
    }
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      await api.uploadSales(formData);
      setUploadFile(null);
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Failed to process sales report');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFinalCounts = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const actualArray = Object.keys(actualCounts).map(id => ({
      rawItemId: id,
      quantity: Number(actualCounts[id]) || 0
    }));

    try {
      await api.submitFinalCounts(actualArray);
      await refreshSession();
      await refreshHistory();
    } catch (err) {
      setError(err.message || 'Failed to close inventory session');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm('Are you sure you want to cancel the current session? All uploaded sales and session changes will be lost.')) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.deleteSession(activeSession._id);
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Failed to cancel session');
    } finally {
      setLoading(false);
    }
  };

  // 1. NO ACTIVE SESSION - INITIAL INVENTORY CONFIG
  if (!activeSession) {
    // Filter and Paginate initial items
    const filteredRawItems = rawItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredRawItems.length / itemsPerPage) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * itemsPerPage;
    const paginatedRawItems = filteredRawItems.slice(startIndex, startIndex + itemsPerPage);

    const handleSearchChange = (e) => {
      setSearchQuery(e.target.value);
      setCurrentPage(1); // Reset page on new search
    };

    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Day Start Count</h1>
            <p className="page-subtitle">Start a daily inventory cycle by entering initial raw ingredient stocks</p>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 className="form-label" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clipboard size={20} style={{ color: 'var(--primary)' }} /> Setup Starting Stock
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {completedSessions.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} 
                  onClick={handleLoadLastCounts}
                >
                  <RefreshCw size={15} /> Load from Yesterday
                </button>
              )}
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--primary-glow)' }}
                onClick={() => document.getElementById('initial-csv-input').click()}
              >
                <FileSpreadsheet size={15} style={{ color: 'var(--primary)' }} /> Upload Counts CSV
              </button>
              <input
                id="initial-csv-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleInitialCountCsvUpload}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {uploadFeedback && (
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#fff', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                {uploadFeedback.message}
              </div>
              {uploadFeedback.unmatchedCount > 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  ⚠️ {uploadFeedback.unmatchedCount} item(s) in CSV could not be matched by name. Unmatched sample: {uploadFeedback.unmatched.join(', ')}
                </div>
              )}
            </div>
          )}

          {rawItems.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' }}>
              Please add raw ingredients in the **Ingredients** page before initializing a session.
            </p>
          ) : (
            <form onSubmit={handleStartSession}>
              {/* Search Bar */}
              <div className="search-container" style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={18} />
                <input
                  type="text"
                  placeholder="Search start stock ingredients..."
                  className="input-field"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="table-container" style={{ marginBottom: '1rem' }}>
                <table className="custom-table responsive-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Unit</th>
                      <th style={{ width: '200px' }}>Initial Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRawItems.map(item => (
                      <tr key={item._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {item.unit}
                          </span>
                        </td>
                        <td data-label="Initial Count">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="input-field"
                            value={initialCounts[item._id] ?? ''}
                            onChange={(e) => setInitialCounts({
                              ...initialCounts,
                              [item._id]: e.target.value
                            })}
                            style={{ textAlign: 'right', fontWeight: 600 }}
                          />
                        </td>
                      </tr>
                    ))}
                    {paginatedRawItems.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                          No matching ingredients found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredRawItems.length)} of {filteredRawItems.length} ingredients
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                      disabled={activePage === 1}
                      onClick={() => setCurrentPage(activePage - 1)}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                      Page {activePage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                      disabled={activePage === totalPages}
                      onClick={() => setCurrentPage(activePage + 1)}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Initializing...' : 'Initialize Starting Stock'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2. ACTIVE SESSION - WAITING FOR SALES CSV UPLOAD
  if (!activeSession.salesFile) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Day End Sales</h1>
            <p className="page-subtitle">Upload the daily POS sales report file to calculate raw usage</p>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            onClick={handleCancelSession}
            disabled={loading}
          >
            <Trash2 size={16} /> Cancel Session
          </button>
        </div>

        <div className="card">
          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} style={{ color: 'var(--primary)' }} /> Upload POS Sales CSV
          </h2>

          {error && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleUploadSales}>
            <div 
              className="upload-dropzone" 
              onClick={() => document.getElementById('sales-file-input').click()}
            >
              <Upload className="upload-icon" />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {uploadFile ? uploadFile.name : 'Select or drag your POS sales report CSV'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Supports standard day_end_sales.csv exports containing items and modifier SKUs
              </p>
              <input
                id="sales-file-input"
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
              {loading ? 'Uploading & Calculating...' : 'Upload & Compute Ingredient Usage'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. ACTIVE SESSION - UPLOADED, NEED ACTUAL FINAL INVENTORY INPUT
  // Calculate summary metrics for live variance checking
  let totalItems = activeSession.initialInventory.length;
  let totalCounted = 0;
  let shortageCount = 0;
  let overageCount = 0;
  let onTargetCount = 0;
  let unenteredCount = 0;

  activeSession.initialInventory.forEach(item => {
    const id = item.rawItemId._id || item.rawItemId;
    const initial = item.quantity;
    const usageItem = activeSession.calculatedUsage.find(u => (u.rawItemId._id || u.rawItemId) === id);
    const usage = usageItem ? usageItem.quantity : 0;
    const expectedRemaining = Math.max(0, initial - usage);

    const actualVal = actualCounts[id];
    if (actualVal === undefined || actualVal === '' || actualVal === null) {
      unenteredCount++;
    } else {
      totalCounted++;
      const actual = Number(actualVal) || 0;
      const diff = actual - expectedRemaining;
      if (diff > 0.05) {
        overageCount++;
      } else if (diff < -0.05) {
        shortageCount++;
      } else {
        onTargetCount++;
      }
    }
  });

  // Filter and Paginate Stage 3 items
  const filteredEndInventory = activeSession.initialInventory.filter(item => {
    const name = item.rawItemId?.name || 'Unknown';
    return name.toLowerCase().includes(searchQueryEnd.toLowerCase());
  });

  const totalPagesEnd = Math.ceil(filteredEndInventory.length / itemsPerPage) || 1;
  const activePageEnd = Math.min(currentPageEnd, totalPagesEnd);
  const startIndexEnd = (activePageEnd - 1) * itemsPerPage;
  const paginatedEndInventory = filteredEndInventory.slice(startIndexEnd, startIndexEnd + itemsPerPage);

  const handleSearchChangeEnd = (e) => {
    setSearchQueryEnd(e.target.value);
    setCurrentPageEnd(1);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Actual Count & Variance</h1>
          <p className="page-subtitle">Enter manual count values to finalize variance and spoilage reports</p>
        </div>
        <button 
          type="button" 
          className="btn btn-secondary" 
          style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
          onClick={handleCancelSession}
          disabled={loading}
        >
          <Trash2 size={16} /> Cancel Session
        </button>
      </div>

      {/* Upload Info banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>POS Sales Data Processed</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Uploaded file: <span style={{ fontStyle: 'italic', color: '#fff' }}>{activeSession.salesFile}</span> ({activeSession.salesData.length} records parsed)
          </div>
        </div>
      </div>

      {/* Live Result Check Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{totalItems}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Items</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: unenteredCount > 0 ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255, 255, 255, 0.02)', border: unenteredCount > 0 ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: unenteredCount > 0 ? 'var(--warning)' : '#fff' }}>{unenteredCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uncounted</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: shortageCount > 0 ? 'var(--danger-glow)' : 'rgba(255, 255, 255, 0.02)', border: shortageCount > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: shortageCount > 0 ? 'var(--danger)' : '#fff' }}>{shortageCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shortage (Loss)</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: overageCount > 0 ? 'var(--success-glow)' : 'rgba(255, 255, 255, 0.02)', border: overageCount > 0 ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: overageCount > 0 ? 'var(--success)' : '#fff' }}>{overageCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overage (Extra)</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{onTargetCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Target</div>
        </div>
      </div>

      <div className="card">
        <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clipboard size={20} style={{ color: 'var(--primary)' }} /> Submit Actual Count
        </h2>

        {error && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitFinalCounts}>
          {/* Search Bar */}
          <div className="search-container" style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={18} />
            <input
              type="text"
              placeholder="Search active session ingredients..."
              className="input-field"
              value={searchQueryEnd}
              onChange={handleSearchChangeEnd}
              style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="table-container" style={{ marginBottom: '1rem' }}>
            <table className="custom-table responsive-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Initial Count</th>
                  <th style={{ textAlign: 'right' }}>Expected Usage</th>
                  <th style={{ textAlign: 'right' }}>Expected Remaining</th>
                  <th>Actual Final Count</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Live Variance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEndInventory.map(item => {
                  const id = item.rawItemId._id || item.rawItemId;
                  const name = item.rawItemId?.name || 'Unknown';
                  const unit = item.rawItemId?.unit || '';
                  const initial = item.quantity;
                  
                  // find usage
                  const usageItem = activeSession.calculatedUsage.find(u => (u.rawItemId._id || u.rawItemId) === id);
                  const usage = usageItem ? usageItem.quantity : 0;
                  const expectedRemaining = Math.max(0, initial - usage);

                  // live variance calculation
                  const actualVal = actualCounts[id];
                  const hasVal = actualVal !== undefined && actualVal !== '' && actualVal !== null;
                  const actual = hasVal ? Number(actualVal) || 0 : 0;
                  const diff = actual - expectedRemaining;

                  return (
                    <tr key={id}>
                      <td data-label="Ingredient" style={{ fontWeight: 600 }}>{name}</td>
                      <td data-label="Unit">
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {unit}
                        </span>
                      </td>
                      <td data-label="Initial" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{initial.toFixed(1)}</td>
                      <td data-label="Expected Usage" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{usage.toFixed(1)}</td>
                      <td data-label="Exp. Remaining" style={{ textAlign: 'right', fontWeight: 600 }}>{expectedRemaining.toFixed(1)}</td>
                      <td data-label="Actual Count">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="input-field"
                          placeholder="0"
                          value={actualCounts[id] ?? ''}
                          onChange={(e) => setActualCounts({
                            ...actualCounts,
                            [id]: e.target.value
                          })}
                          style={{ textAlign: 'right', fontWeight: 600 }}
                        />
                      </td>
                      <td data-label="Live Variance" style={{ textAlign: 'center' }}>
                        {hasVal ? (
                          diff > 0.05 ? (
                            <span className="badge" style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontWeight: 600 }}>
                              +{diff.toFixed(1)}
                            </span>
                          ) : diff < -0.05 ? (
                            <span className="badge" style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontWeight: 600 }}>
                              {diff.toFixed(1)}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                              0.0
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paginatedEndInventory.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                      No matching ingredients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls for Day End */}
          {totalPagesEnd > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Showing {startIndexEnd + 1} - {Math.min(startIndexEnd + itemsPerPage, filteredEndInventory.length)} of {filteredEndInventory.length} ingredients
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                  disabled={activePageEnd === 1}
                  onClick={() => setCurrentPageEnd(activePageEnd - 1)}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                  Page {activePageEnd} of {totalPagesEnd}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                  disabled={activePageEnd === totalPagesEnd}
                  onClick={() => setCurrentPageEnd(activePageEnd + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Submitting & Finalizing...' : 'Calculate Variance & Complete Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
