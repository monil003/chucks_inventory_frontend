import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Save, Info, FileSpreadsheet, CheckCircle, ShieldAlert, RefreshCw, Clipboard, CheckCircle2, BarChart3, FileText } from 'lucide-react';

export default function CsvMapping({ activeRestaurant, currentUser, onRefreshUser }) {
  const [mappings, setMappings] = useState({
    initialCountNameKey: 'Description',
    initialCountQtyKey: 'Quantity',
    endCountNameKey: 'Description',
    endCountQtyKey: 'Quantity',
    salesSkuKey: 'item_sku_code',
    salesNameKey: 'item_name',
    salesQtyKey: 'qty',
    salesAddonQtyKey: 'addon_qty',
    orderGuideNameKey: 'Description',
    orderGuideUnitKey: 'Unit Measure',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('initialCount'); // initialCount, endCount, sales, orderGuide

  // Populate mappings from activeRestaurant's csvMapping
  useEffect(() => {
    if (activeRestaurant && activeRestaurant.csvMapping) {
      const cm = activeRestaurant.csvMapping;
      setMappings({
        initialCountNameKey: cm.initialCountNameKey || cm.countNameKey || 'Description',
        initialCountQtyKey: cm.initialCountQtyKey || cm.countQtyKey || 'Quantity',
        endCountNameKey: cm.endCountNameKey || cm.countNameKey || 'Description',
        endCountQtyKey: cm.endCountQtyKey || cm.countQtyKey || 'Quantity',
        salesSkuKey: cm.salesSkuKey || 'item_sku_code',
        salesNameKey: cm.salesNameKey || 'item_name',
        salesQtyKey: cm.salesQtyKey || 'qty',
        salesAddonQtyKey: cm.salesAddonQtyKey || 'addon_qty',
        orderGuideNameKey: cm.orderGuideNameKey || 'Description',
        orderGuideUnitKey: cm.orderGuideUnitKey || 'Unit Measure',
      });
    }
  }, [activeRestaurant]);

  const handleInputChange = (field, value) => {
    setMappings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all mappings to system defaults?')) {
      setMappings({
        initialCountNameKey: 'Description',
        initialCountQtyKey: 'Quantity',
        endCountNameKey: 'Description',
        endCountQtyKey: 'Quantity',
        salesSkuKey: 'item_sku_code',
        salesNameKey: 'item_name',
        salesQtyKey: 'qty',
        salesAddonQtyKey: 'addon_qty',
        orderGuideNameKey: 'Description',
        orderGuideUnitKey: 'Unit Measure',
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!activeRestaurant) {
      setErrorMsg('No active restaurant context selected.');
      return;
    }

    // Validate that inputs are not completely whitespace
    for (const key of Object.keys(mappings)) {
      if (!mappings[key].trim()) {
        setErrorMsg('Column header mapping keys cannot be blank.');
        return;
      }
    }

    setSaving(true);
    try {
      const updatedRest = await api.updateCsvMapping(activeRestaurant._id, mappings);
      setSuccessMsg('CSV mapping configuration saved successfully!');
      
      // Update local storage and reload app state
      const savedRest = localStorage.getItem('activeRestaurant');
      if (savedRest) {
        const parsed = JSON.parse(savedRest);
        if (parsed._id === updatedRest._id) {
          localStorage.setItem('activeRestaurant', JSON.stringify(updatedRest));
        }
      }
      
      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update mapping configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeRestaurant) {
    return (
      <div className="card text-center animate-fade-in" style={{ padding: '3.5rem 2rem', border: 'var(--glass-border)', maxWidth: '600px', margin: '4rem auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '1.25rem' }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Please select or register an approved restaurant context to configure CSV upload settings.
        </p>
      </div>
    );
  }

  return (
    <div className="csv-mapping-page animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">CSV Column Mappings</h1>
          <p className="page-subtitle">Configure custom headers for CSV uploads to match your restaurant's specific export files</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Form Settings */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Header Configuration</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Restaurant: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{activeRestaurant.name}</span></p>
              </div>
            </div>

            <button
              onClick={handleResetToDefaults}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset configuration to defaults"
            >
              <RefreshCw size={12} />
              Reset Defaults
            </button>
          </div>

          {successMsg && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} />
              {errorMsg}
            </div>
          )}

          {/* Sub tabs selector */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.35rem', borderRadius: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveSubTab('initialCount')}
              style={{
                flex: '1 1 auto',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'initialCount' ? 'var(--primary-gradient)' : 'transparent',
                color: activeSubTab === 'initialCount' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Clipboard size={14} />
              Day Initial Count
            </button>
            <button
              onClick={() => setActiveSubTab('endCount')}
              style={{
                flex: '1 1 auto',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'endCount' ? 'var(--primary-gradient)' : 'transparent',
                color: activeSubTab === 'endCount' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <CheckCircle2 size={14} />
              Day End Count
            </button>
            <button
              onClick={() => setActiveSubTab('sales')}
              style={{
                flex: '1 1 auto',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'sales' ? 'var(--primary-gradient)' : 'transparent',
                color: activeSubTab === 'sales' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <BarChart3 size={14} />
              Day End Sales
            </button>
            <button
              onClick={() => setActiveSubTab('orderGuide')}
              style={{
                flex: '1 1 auto',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'orderGuide' ? 'var(--primary-gradient)' : 'transparent',
                color: activeSubTab === 'orderGuide' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <FileText size={14} />
              Order Guide
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Tab 1: Day Initial Count */}
            {activeSubTab === 'initialCount' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Configure headers for the opening count CSV file uploaded under the **Day Start Count** view.
                </p>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Ingredient Name Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.initialCountNameKey}
                    onChange={(e) => handleInputChange('initialCountNameKey', e.target.value)}
                    placeholder="e.g. Description or ItemName"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Matches the name of ingredients in your database. Default: `Description`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Counted Quantity Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.initialCountQtyKey}
                    onChange={(e) => handleInputChange('initialCountQtyKey', e.target.value)}
                    placeholder="e.g. Quantity or Count"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Contains the measured opening stock volume. Default: `Quantity`.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Day End Count */}
            {activeSubTab === 'endCount' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Configure headers for the closing count CSV file uploaded under the **Day End Count** view.
                </p>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Ingredient Name Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.endCountNameKey}
                    onChange={(e) => handleInputChange('endCountNameKey', e.target.value)}
                    placeholder="e.g. Description or ItemName"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Matches the name of ingredients in your database. Default: `Description`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Counted Quantity Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.endCountQtyKey}
                    onChange={(e) => handleInputChange('endCountQtyKey', e.target.value)}
                    placeholder="e.g. Quantity or Count"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Contains the measured closing stock volume. Default: `Quantity`.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Day End Sales */}
            {activeSubTab === 'sales' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Configure headers for the POS sales report CSV file uploaded under the **Day End Sales** page.
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Item SKU / Product Code Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.salesSkuKey}
                    onChange={(e) => handleInputChange('salesSkuKey', e.target.value)}
                    placeholder="e.g. item_sku_code or SKU"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Unique recipe sku identifier. Default: `item_sku_code`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Item Name Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.salesNameKey}
                    onChange={(e) => handleInputChange('salesNameKey', e.target.value)}
                    placeholder="e.g. item_name or Product"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Name of the menu item sold. Default: `item_name`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Base Quantity Sold Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.salesQtyKey}
                    onChange={(e) => handleInputChange('salesQtyKey', e.target.value)}
                    placeholder="e.g. qty or quantity_sold"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Volume of base items sold. Default: `qty`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Addon / Modifier Quantity Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.salesAddonQtyKey}
                    onChange={(e) => handleInputChange('salesAddonQtyKey', e.target.value)}
                    placeholder="e.g. addon_qty or mod_qty"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Volume of recipe addons or modifiers. Default: `addon_qty`.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Order Guide */}
            {activeSubTab === 'orderGuide' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Configure headers for the bulk ingredient CSV file uploaded under the **Ingredients** page.
                </p>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Ingredient Name Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.orderGuideNameKey}
                    onChange={(e) => handleInputChange('orderGuideNameKey', e.target.value)}
                    placeholder="e.g. Description or ItemName"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Maps to ingredient name in our database. Default: `Description`.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Unit of Measure Column
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={mappings.orderGuideUnitKey}
                    onChange={(e) => handleInputChange('orderGuideUnitKey', e.target.value)}
                    placeholder="e.g. Unit Measure or UOM"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Maps to ingredient measurement unit (e.g., kg, lbs, pcs). Default: `Unit Measure`.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', marginTop: '0.75rem' }}
            >
              <Save size={16} />
              {saving ? 'Saving Mapping Settings...' : 'Save Mapping Configuration'}
            </button>
          </form>
        </div>

        {/* Right Column: Visual Reference & Mapping Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ color: 'var(--primary)', marginTop: '0.15rem' }}>
                <Info size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Why map CSV columns?</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Every restaurant uses different Point of Sale (POS) and inventory systems. By specifying exactly which column headers map to our parameters, you can upload your existing raw export files directly.
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Our parser checks for the column names defined here. If columns are not found, it falls back to parsing default column names, minimizing disruption.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Active Mapping Diagram</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {activeSubTab === 'initialCount' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Parameter</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Your CSV Header</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Ingredient Name</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.initialCountNameKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Opening Counted Qty</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.initialCountQtyKey}</span>
                  </div>
                </>
              )}

              {activeSubTab === 'endCount' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Parameter</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Your CSV Header</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Ingredient Name</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.endCountNameKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Closing Counted Qty</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.endCountQtyKey}</span>
                  </div>
                </>
              )}

              {activeSubTab === 'sales' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Parameter</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Your CSV Header</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Product SKU / Code</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.salesSkuKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Menu Item Name</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.salesNameKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Base Sold Qty</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.salesQtyKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Addon / Modifier Qty</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.salesAddonQtyKey}</span>
                  </div>
                </>
              )}

              {activeSubTab === 'orderGuide' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Parameter</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Your CSV Header</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Ingredient Name</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.orderGuideNameKey}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Unit of Measure</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{mappings.orderGuideUnitKey}</span>
                  </div>
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
