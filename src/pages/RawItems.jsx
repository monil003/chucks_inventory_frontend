import React, { useState } from 'react';
import { Trash2, Plus, Sparkles, Upload, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function RawItems({ rawItems, onCreateRawItem, onDeleteRawItem, onRefreshRawItems }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [error, setError] = useState('');

  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }

    try {
      await onCreateRawItem({ name: name.trim(), unit });
      setName('');
    } catch (err) {
      setError(err.message || 'Failed to create raw item');
    }
  };

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setUploadSuccess('');
    setUploadError('');
  };

  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setUploadError('Please select a CSV file first');
      return;
    }
    setUploading(true);
    setUploadSuccess('');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await api.uploadOrderGuide(formData);
      setCsvFile(null);
      setUploadSuccess(`Processed ${response.totalProcessed} items! (Upserted: ${response.upsertedCount}, Modified: ${response.modifiedCount})`);
      if (onRefreshRawItems) {
        await onRefreshRawItems();
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload Order Guide CSV');
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Ingredients</h1>
          <p className="page-subtitle">Add and manage the ingredients used in your restaurant recipes</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: 'fit-content' }}>
          {/* Add Raw Item Form */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Add Ingredient
            </h2>
            
            {error && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ingredient Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Beef Patty 4oz, Cheese Slice, Burger Bun"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select
                  className="input-field"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ appearance: 'none', background: 'rgba(0, 0, 0, 0.3) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center', backgroundSize: '16px' }}
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="portion">Portions</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="L">Liters (L)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                <Plus size={18} /> Add Ingredient
              </button>
            </form>
          </div>

          {/* Bulk Import Order Guide Card */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} style={{ color: 'var(--primary)' }} /> Bulk Import Order Guide
            </h2>

            {uploadError && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadCSV}>
              <div 
                className="upload-dropzone" 
                onClick={() => document.getElementById('csv-file-input').click()}
                style={{ padding: '2rem 1rem' }}
              >
                <Upload className="upload-icon" style={{ height: '36px', width: '36px', marginBottom: '0.5rem' }} />
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                  {csvFile ? csvFile.name : 'Select Order Guide CSV'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Supports Order_Guide.csv containing raw item Descriptions and Unit Measures
                </p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }} 
                disabled={uploading || !csvFile}
              >
                {uploading ? 'Importing items...' : 'Upload & Bulk Import'}
              </button>
            </form>
          </div>
        </div>

        {/* Raw Items List Table */}
        <div className="card">

          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Current Ingredients ({rawItems.length})</h2>
          
          {rawItems.length > 0 ? (
            <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Unit of Measure</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rawItems.map(item => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span className="badge badge-warning" style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {item.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${item.name}"? This will affect recipes using this item.`)) {
                              onDeleteRawItem(item._id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No ingredients created yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
