import React, { useState } from 'react';
import { Trash2, Plus, Sparkles, Upload, CheckCircle2, Search, Edit2, X } from 'lucide-react';
import { api } from '../api';

export default function RawItems({ rawItems, onCreateRawItem, onUpdateRawItem, onDeleteRawItem, onRefreshRawItems }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [quantityPerBox, setQuantityPerBox] = useState(0);
  const [packagesPerBox, setPackagesPerBox] = useState(0);
  const [quantityPerPackage, setQuantityPerPackage] = useState(0);
  const [price, setPrice] = useState(0);
  const [isAccurateCount, setIsAccurateCount] = useState(false);
  const [error, setError] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByAlphabetical, setSortByAlphabetical] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

    const ppb = Number(packagesPerBox) || 0;
    const qpp = Number(quantityPerPackage) || 0;
    const calculatedQtyPerBox = (ppb > 0 && qpp > 0) ? (ppb * qpp) : (Number(quantityPerBox) || 0);

    try {
      if (editingItem) {
        await onUpdateRawItem(editingItem._id, { 
          name: name.trim(), 
          unit, 
          quantityPerBox: calculatedQtyPerBox,
          packagesPerBox: ppb,
          quantityPerPackage: qpp,
          price: Number(price) || 0,
          isAccurateCount
        });
      } else {
        await onCreateRawItem({ 
          name: name.trim(), 
          unit, 
          quantityPerBox: calculatedQtyPerBox,
          packagesPerBox: ppb,
          quantityPerPackage: qpp,
          price: Number(price) || 0,
          isAccurateCount
        });
      }
      handleCancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to save raw item');
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setQuantityPerBox(item.quantityPerBox || 0);
    setPackagesPerBox(item.packagesPerBox || 0);
    setQuantityPerPackage(item.quantityPerPackage || 0);
    setPrice(item.price || 0);
    setIsAccurateCount(item.isAccurateCount || false);
    setError('');
    setIsFormModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setName('');
    setUnit('pcs');
    setQuantityPerBox(0);
    setPackagesPerBox(0);
    setQuantityPerPackage(0);
    setPrice(0);
    setIsAccurateCount(false);
    setError('');
    setIsFormModalOpen(false);
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
      setTimeout(() => {
        setIsImportModalOpen(false);
        setUploadSuccess('');
      }, 2000);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload Order Guide CSV');
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = rawItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedItems = sortByAlphabetical
    ? [...filteredItems].sort((a, b) => a.name.localeCompare(b.name))
    : filteredItems;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Raw Ingredients</h1>
          <p className="page-subtitle">Add and manage the ingredients used in your restaurant recipes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              handleCancelEdit();
              setIsFormModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={18} /> Add Ingredient
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', borderColor: 'rgba(249, 115, 22, 0.15)' }}
            onClick={() => {
              setCsvFile(null);
              setUploadSuccess('');
              setUploadError('');
              setIsImportModalOpen(true);
            }}
          >
            <Upload size={18} /> Import Order Guide
          </button>
        </div>
      </div>

      {/* Raw Items List Table */}
      <div className="card" style={{ width: '100%' }}>
        <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Current Ingredients ({rawItems.length})</h2>

        {rawItems.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ position: 'relative', flex: 1, minWidth: '240px', marginBottom: 0 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
              />
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>

            {/* Custom styled premium switch toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              background: 'rgba(255, 255, 255, 0.03)', 
              padding: '0.5rem 1rem', 
              borderRadius: '12px', 
              border: '1px solid rgba(255, 255, 255, 0.08)',
              userSelect: 'none'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sort Alphabetically</span>
              <button
                type="button"
                onClick={() => setSortByAlphabetical(prev => !prev)}
                style={{
                  position: 'relative',
                  width: '42px',
                  height: '24px',
                  borderRadius: '12px',
                  background: sortByAlphabetical ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transform: sortByAlphabetical ? 'translateX(22px)' : 'translateX(4px)',
                  transition: 'transform 0.2s ease'
                }} />
              </button>
            </div>
          </div>
        )}
        
        {displayedItems.length > 0 ? (
          <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="custom-table responsive-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit of Measure</th>
                  <th>Qty per Box</th>
                  <th>Price ($)</th>
                  <th>Accurate</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map(item => (
                  <tr key={item._id} style={editingItem?._id === item._id ? { background: 'rgba(249, 115, 22, 0.08)' } : {}}>
                    <td data-label="Name" style={{ fontWeight: 600 }}>{item.name}</td>
                    <td data-label="Unit">
                      <span className="badge badge-warning" style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {item.unit}
                      </span>
                    </td>
                    <td data-label="Qty per Box">
                      {item.packagesPerBox > 0 && item.quantityPerPackage > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span className="badge" style={{ color: '#fff', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8rem' }}>
                            {item.packagesPerBox} pk / box ({item.quantityPerPackage} {item.unit}/pk)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.25rem' }}>
                            Total: {item.quantityPerBox} {item.unit} / box
                          </span>
                        </div>
                      ) : item.quantityPerBox > 0 ? (
                        <span className="badge" style={{ color: '#fff', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          {item.quantityPerBox} {item.unit} / box
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td data-label="Price ($)">
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--success)' }}>
                        ${item.price !== undefined && item.price !== null ? Number(item.price).toFixed(2) : '0.00'}
                      </span>
                    </td>
                    <td data-label="Accurate">
                      {item.isAccurateCount ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
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

      {/* Add / Edit Modal Popup */}
      {isFormModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '480px', position: 'relative' }}>
            <button 
              onClick={handleCancelEdit} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  autoFocus
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
                  <option value="oz/box">oz/box</option>
                  <option value="oz/pk">oz/pk</option>
                  <option value="oz/bucket">oz/bucket</option>
                  <option value="pcs/box">pcs/box</option>
                  <option value="pcs/pk">pcs/pk</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Packages per Box (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="e.g. 10 pk"
                    value={packagesPerBox || ''}
                    onChange={(e) => setPackagesPerBox(e.target.value)}
                    style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qty per Package (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    placeholder="e.g. 5 units/pk"
                    value={quantityPerPackage || ''}
                    onChange={(e) => setQuantityPerPackage(e.target.value)}
                    style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity per Box (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input-field"
                  placeholder={(Number(packagesPerBox) && Number(quantityPerPackage)) ? `${packagesPerBox * quantityPerPackage} (Auto-calculated)` : "e.g. 10 (Leave 0 if not counted in boxes)"}
                  value={(Number(packagesPerBox) && Number(quantityPerPackage)) ? (packagesPerBox * quantityPerPackage) : (quantityPerBox || '')}
                  onChange={(e) => setQuantityPerBox(e.target.value)}
                  disabled={Boolean(Number(packagesPerBox) && Number(quantityPerPackage))}
                  style={{ 
                    background: (Number(packagesPerBox) && Number(quantityPerPackage)) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.2)',
                    cursor: (Number(packagesPerBox) && Number(quantityPerPackage)) ? 'not-allowed' : 'text'
                  }}
                />
                {(Number(packagesPerBox) && Number(quantityPerPackage)) ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    💡 1 Box = {packagesPerBox} packages x {quantityPerPackage} {unit} = {packagesPerBox * quantityPerPackage} {unit}
                  </span>
                ) : null}
              </div>

              <div className="form-group">
                <label className="form-label">Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input-field"
                  placeholder="e.g. 15.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                <input
                  type="checkbox"
                  id="accurate-count"
                  checked={isAccurateCount}
                  onChange={(e) => setIsAccurateCount(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="accurate-count" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                  Is Accurate Count
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    Track actual usage and variance specifically for this ingredient.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editingItem ? 'Save Changes' : 'Add Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal Popup */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '480px', position: 'relative' }}>
            <button 
              onClick={() => setIsImportModalOpen(false)} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                style={{ padding: '2.5rem 1rem', marginBottom: '1.5rem', cursor: 'pointer' }}
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2 }} 
                  disabled={uploading || !csvFile}
                >
                  {uploading ? 'Importing items...' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
