import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Calendar, Table } from 'lucide-react';

export default function DayEndSales({ onRefreshAll }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [session, setSession] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  const hasSales = session && session.salesFile && session.salesData && session.salesData.length > 0;

  return (
    <div className="day-end-sales-page animate-fade-in">
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

      <div className="dashboard-grid">
        {/* Upload Column */}
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

          {hasSales && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Processed POS File: <strong style={{ color: '#fff' }}>{session.salesFile}</strong> ({session.salesData.length} unique sales transactions).
              </div>
            </div>
          )}
        </div>

        {/* Display Usage Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Computed Ingredient Depletion</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Quantities deducted from inventory based on portions and sold items</p>
          </div>

          {!hasSales ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
              <Table size={36} />
              <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Please upload a POS sales report to view ingredient depletion metrics.</p>
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
    </div>
  );
}
