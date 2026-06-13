import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Search, Plus, Trash2, BookOpen, Edit2 } from 'lucide-react';
import IngredientSearchSelect from '../components/IngredientSearchSelect';

export default function Recipes({ recipes, rawItems, onSaveRecipe, onDeleteRecipe }) {
  // Autocomplete Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Form State
  const [selectedIngredients, setSelectedIngredients] = useState([]); // [{ rawItemId, quantity }]
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle outside clicks to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await api.searchMenuItems(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search menu items', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectMenuItem = (item) => {
    setSelectedMenuItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
    
    // Pre-populate if recipe already exists
    const existing = recipes.find(r => r.menuItemSku === item.item_sku_code);
    if (existing) {
      setSelectedIngredients(
        existing.ingredients.map(ing => ({
          rawItemId: ing.rawItemId._id || ing.rawItemId,
          quantity: ing.quantity
        }))
      );
    } else {
      setSelectedIngredients([]);
    }
  };

  const handleAddIngredientRow = () => {
    if (rawItems.length === 0) return;
    // Add first raw item as placeholder
    setSelectedIngredients([
      ...selectedIngredients,
      { rawItemId: rawItems[0]._id, quantity: 1 }
    ]);
  };

  const handleRemoveIngredientRow = (index) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...selectedIngredients];
    updated[index][field] = value;
    setSelectedIngredients(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMenuItem) {
      setError('Please search and select a POS Menu Product');
      return;
    }

    if (selectedIngredients.length === 0) {
      setError('Please add at least one ingredient mapping');
      return;
    }

    // Verify quantities are valid numbers > 0
    for (let ing of selectedIngredients) {
      if (!ing.quantity || isNaN(ing.quantity) || Number(ing.quantity) <= 0) {
        setError('Ingredient quantities must be greater than zero');
        return;
      }
    }

    try {
      await onSaveRecipe({
        menuItemSku: selectedMenuItem.item_sku_code,
        menuItemName: selectedMenuItem.name,
        ingredients: selectedIngredients
      });
      setSuccess(`Successfully saved recipe for ${selectedMenuItem.name}!`);
      // Reset form
      setSelectedMenuItem(null);
      setSearchQuery('');
      setSelectedIngredients([]);
    } catch (err) {
      setError(err.message || 'Failed to save recipe');
    }
  };

  const handleStartEditRecipe = (recipe) => {
    const menuItem = {
      item_sku_code: recipe.menuItemSku,
      name: recipe.menuItemName,
      type: 'Item'
    };
    setSelectedMenuItem(menuItem);
    setSearchQuery(recipe.menuItemName);
    
    setSelectedIngredients(
      recipe.ingredients.map(ing => ({
        rawItemId: ing.rawItemId?._id || ing.rawItemId,
        quantity: ing.quantity
      }))
    );
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.menuItemName.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
    recipe.menuItemSku.toLowerCase().includes(catalogSearchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recipes / Ingredient Mapping</h1>
          <p className="page-subtitle">Configure the portions of raw ingredients used by your POS Menu products</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* Creator Card */}
        <div className="card">
          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} style={{ color: 'var(--primary)' }} /> Configure Menu Item Recipe
          </h2>

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
            
            {/* Search autocomplete field */}
            <div className="form-group autocomplete-container" ref={dropdownRef}>
              <label className="form-label">Search POS Product (from CSV)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type to search (e.g. Cheese Burger, Wings...)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="autocomplete-dropdown">
                  {searchResults.map(item => (
                    <div
                      key={item._id}
                      className="autocomplete-item"
                      onClick={() => handleSelectMenuItem(item)}
                    >
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        SKU: {item.item_sku_code} | {item.category_name} &gt; {item.subcat_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedMenuItem && (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: 'var(--primary)' }}>{selectedMenuItem.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SKU Code: {selectedMenuItem.item_sku_code}</p>
                </div>
                <span className="badge badge-success">{selectedMenuItem.type}</span>
              </div>
            )}

            {/* Dynamic Ingredient Rows */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Ingredients portion allocation</label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={handleAddIngredientRow}
                  disabled={rawItems.length === 0}
                >
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>

              {rawItems.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Please define raw ingredients first in the Ingredients tab.</p>
              )}

              {selectedIngredients.map((row, index) => {
                const selectedItem = rawItems.find(i => i._id === row.rawItemId);
                return (
                  <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }} className="animate-fade-in">
                    
                    <div style={{ flex: 2 }}>
                      <IngredientSearchSelect
                        value={row.rawItemId}
                        options={rawItems}
                        onChange={(val) => handleIngredientChange(index, 'rawItemId', val)}
                        placeholder="Select Ingredient..."
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="any"
                        className="input-field"
                        placeholder="Quantity"
                        value={row.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: '40px' }}>
                        {selectedItem ? selectedItem.unit : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', padding: '0.75rem', borderColor: 'transparent' }}
                      onClick={() => handleRemoveIngredientRow(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={!selectedMenuItem}>
              Save Recipe Formula
            </button>
          </form>
        </div>

        {/* Recipes Catalog List */}
        <div className="card">
          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Portion Recipes ({recipes.length})</h2>
          
          {recipes.length > 0 && (
            <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search recipes by name or SKU..."
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          )}

          {filteredRecipes.length > 0 ? (
            <div className="table-container">
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Menu Product</th>
                    <th>SKU Code</th>
                    <th>Ingredients Formula</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map(recipe => (
                    <tr key={recipe._id} style={selectedMenuItem?.item_sku_code === recipe.menuItemSku ? { background: 'rgba(249, 115, 22, 0.08)' } : {}}>
                      <td data-label="Menu Product">
                        <div style={{ fontWeight: 600 }}>{recipe.menuItemName}</div>
                      </td>
                      <td data-label="SKU Code" style={{ color: 'var(--text-secondary)' }}>{recipe.menuItemSku}</td>
                      <td data-label="Ingredients">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {recipe.ingredients.map((ing, i) => (
                            <span 
                              key={i} 
                              className="badge" 
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
                            >
                              {ing.rawItemId?.name || 'Unknown'}: {ing.quantity} {ing.rawItemId?.unit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td data-label="Action" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', color: 'var(--primary)', borderColor: 'rgba(249, 115, 22, 0.15)' }}
                          onClick={() => handleStartEditRecipe(recipe)}
                          title="Edit recipe"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the recipe for "${recipe.menuItemName}"?`)) {
                              if (selectedMenuItem?.item_sku_code === recipe.menuItemSku) {
                                setSelectedMenuItem(null);
                                setSearchQuery('');
                                setSelectedIngredients([]);
                              }
                              onDeleteRecipe(recipe._id);
                            }
                          }}
                          title="Delete recipe"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : recipes.length > 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No matching recipes found.</p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No recipes configured yet.</p>
          )}
        </div>

      </div>
    </div>
  );
}
