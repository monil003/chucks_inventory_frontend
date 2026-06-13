import React, { useState } from 'react';
import { Trash2, Plus, Sparkles, Upload, CheckCircle2, Search, Edit2 } from 'lucide-react';
import { api } from '../api';

export default function RawItems({ rawItems, onCreateRawItem, onUpdateRawItem, onDeleteRawItem, onRefreshRawItems }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [error, setError] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (editingItem) {
        await onUpdateRawItem(editingItem._id, { name: name.trim(), unit });
        setEditingItem(null);
      } else {
        await onCreateRawItem({ name: name.trim(), unit });
      }
      setName('');
      setUnit('pcs');
    } catch (err) {
      setError(err.message || 'Failed to save raw item');
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setName('');
    setUnit('pcs');
    setError('');
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


  const filteredItems = rawItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              {editingItem ? <Edit2 size={20} style={{ color: 'var(--primary)' }} /> : <Sparkles size={20} style={{ color: 'var(--primary)' }} />} 
              {editingItem ? 'Edit Ingredient' : 'Add Ingredient'}
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
                {editingItem ? 'Save Changes' : <><Plus size={18} /> Add Ingredient</>}
              </button>
              {editingItem && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '0.5rem' }} 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
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

          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Current Ingredients ({rawItems.length})</h2>

          {rawItems.length > 0 && (
            <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          )}
          
          {filteredItems.length > 0 ? (
            <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Unit of Measure</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item._id} style={editingItem?._id === item._id ? { background: 'rgba(249, 115, 22, 0.08)' } : {}}>
                      <td data-label="Name" style={{ fontWeight: 600 }}>{item.name}</td>
                      <td data-label="Unit">
                        <span className="badge badge-warning" style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {item.unit}
                        </span>
                      </td>
                      <td data-label="Action" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', color: 'var(--primary)', borderColor: 'rgba(249, 115, 22, 0.15)' }}
                          onClick={() => handleStartEdit(item)}
                          title="Edit ingredient"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${item.name}"? This will affect recipes using this item.`)) {
                              if (editingItem?._id === item._id) {
                                handleCancelEdit();
                              }
                              onDeleteRawItem(item._id);
                            }
                          }}
                          title="Delete ingredient"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : rawItems.length > 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No matching ingredients found.</p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No ingredients created yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
