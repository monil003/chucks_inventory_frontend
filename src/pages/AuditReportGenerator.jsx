import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Calendar, Upload, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, RefreshCw, Clipboard, FileText } from 'lucide-react';
import InventoryCalendar from '../components/InventoryCalendar';

export default function AuditReportGenerator({ sessions = [], rawItems, recipes, onRefreshAll }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [startingCounts, setStartingCounts] = useState({});
  const [loadingStartingCounts, setLoadingStartingCounts] = useState(false);
  const [startingCountsMessage, setStartingCountsMessage] = useState('');
  const [calendarClickTarget, setCalendarClickTarget] = useState('start');
  const [isPeriodCountsModalOpen, setIsPeriodCountsModalOpen] = useState(false);

  // Local state for deliveries (Invoice items)
  const [deliveries, setDeliveries] = useState([]);
  
  // Local state for sales data
  const [salesData, setSalesData] = useState([]);
  const [salesFileName, setSalesFileName] = useState('');

  // Local state for ending counts (Stock count)
  const [endingCounts, setEndingCounts] = useState({});
  const [endingBoxesInput, setEndingBoxesInput] = useState({});
  const [endingLooseInput, setEndingLooseInput] = useState({});

  // Gemini extraction states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [extractedInvoiceItems, setExtractedInvoiceItems] = useState([]);
  const [parsingInvoice, setParsingInvoice] = useState(false);

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [extractedSalesItems, setExtractedSalesItems] = useState([]);
  const [parsingSales, setParsingSales] = useState(false);

  // General error/success
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);

  // Generated Report Results state
  const [generatedReport, setGeneratedReport] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Load starting counts when startDate changes
  const fetchStartingCounts = async () => {
    if (!startDate) return;
    setLoadingStartingCounts(true);
    setStartingCountsMessage('');
    try {
      const sess = await api.getSessionByDate(startDate);
      const counts = {};
      rawItems.forEach(item => {
        counts[item._id] = 0;
      });

      if (sess) {
        const inventoryToUse = sess.actualFinalInventory && sess.actualFinalInventory.length > 0
          ? sess.actualFinalInventory
          : sess.initialInventory;

        inventoryToUse.forEach(item => {
          counts[item.rawItemId._id || item.rawItemId] = item.quantity;
        });
        setStartingCounts(counts);
        setStartingCountsMessage(`Found inventory count record logged on ${startDate}. Starting count successfully loaded.`);
      } else {
        setStartingCounts(counts);
        setStartingCountsMessage(`No inventory session found on ${startDate}. Starting stock counts will default to 0.`);
      }
    } catch (err) {
      console.error(err);
      setStartingCountsMessage('Error reading starting counts from database.');
    } finally {
      setLoadingStartingCounts(false);
    }
  };

  const handleCalendarDateSelect = (dateStr) => {
    if (calendarClickTarget === 'start') {
      setStartDate(dateStr);
    } else {
      setEndDate(dateStr);
    }
  };

  useEffect(() => {
    fetchStartingCounts();
  }, [startDate, rawItems]);

  // Pre-populate ending counts list
  useEffect(() => {
    const counts = {};
    const boxes = {};
    const loose = {};
    rawItems.forEach(item => {
      counts[item._id] = 0;
      boxes[item._id] = '';
      loose[item._id] = '';
    });
    setEndingCounts(counts);
    setEndingBoxesInput(boxes);
    setEndingLooseInput(loose);
  }, [rawItems]);

  // Handlers for boxes / loose counts input
  const handleBoxesChange = (itemId, val, qtyPerBox) => {
    setEndingBoxesInput(prev => ({ ...prev, [itemId]: val }));
    const boxQty = Number(val) || 0;
    const looseQty = Number(endingLooseInput[itemId]) || 0;
    const total = (boxQty * qtyPerBox) + looseQty;
    setEndingCounts(prev => ({ ...prev, [itemId]: total }));
  };

  const handleLooseChange = (itemId, val, qtyPerBox) => {
    setEndingLooseInput(prev => ({ ...prev, [itemId]: val }));
    const boxQty = Number(endingBoxesInput[itemId]) || 0;
    const looseQty = Number(val) || 0;
    const total = qtyPerBox > 0 ? (boxQty * qtyPerBox) + looseQty : looseQty;
    setEndingCounts(prev => ({ ...prev, [itemId]: total }));
  };

  // Upload Invoice handlers
  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingInvoice(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.parseInvoice(formData);
      if (response && Array.isArray(response.deliveries)) {
        setExtractedInvoiceItems(response.deliveries);
        setIsInvoiceModalOpen(true);
      } else {
        throw new Error('Gemini failed to extract any delivery items.');
      }
    } catch (err) {
      setError(err.message || 'Invoice extraction failed.');
    } finally {
      setParsingInvoice(false);
      e.target.value = ''; // reset file input
    }
  };

  // Upload Sales Report handlers
  const handleSalesUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingSales(true);
    setError('');
    setSuccess('');
    setSalesFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.parseSalesReport(formData);
      if (response && Array.isArray(response.sales)) {
        setExtractedSalesItems(response.sales);
        setIsSalesModalOpen(true);
      } else {
        throw new Error('Gemini failed to extract any sales entries.');
      }
    } catch (err) {
      setError(err.message || 'Sales report extraction failed.');
    } finally {
      setParsingSales(false);
      e.target.value = '';
    }
  };

  // Confirm extracted invoice items
  const handleConfirmInvoice = () => {
    const validDeliveries = extractedInvoiceItems
      .filter(item => item.rawItemId && item.quantity > 0)
      .map(item => ({
        rawItemId: item.rawItemId,
        name: rawItems.find(r => r._id === item.rawItemId)?.name || item.name,
        quantity: Number(item.quantity),
        price: Number(item.price) || 0
      }));

    setDeliveries(prev => [...prev, ...validDeliveries]);
    setIsInvoiceModalOpen(false);
    setSuccess(`Successfully added ${validDeliveries.length} invoice items to deliveries.`);
  };

  // Confirm extracted sales items
  const handleConfirmSales = () => {
    const validSales = extractedSalesItems
      .filter(item => item.quantitySold > 0)
      .map(item => ({
        sku: item.sku || 'UNKNOWN',
        name: item.name,
        quantitySold: Number(item.quantitySold),
        price: Number(item.price) || 0
      }));

    setSalesData(validSales);
    setIsSalesModalOpen(false);
    setSuccess(`Loaded ${validSales.length} sales report records.`);
  };

  // Submit the generated interval report
  const handleGenerateReport = async () => {
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Please select both Start and End Dates.');
      return;
    }

    setGenerating(true);
    try {
      // Map endingCounts object to array
      const endingCountsArray = Object.keys(endingCounts).map(id => ({
        rawItemId: id,
        quantity: endingCounts[id] || 0
      }));

      const payload = {
        startDate,
        endDate,
        deliveries,
        endingCounts: endingCountsArray,
        salesData,
        salesFile: salesFileName || 'Gemini AI Extract'
      };

      const report = await api.generateIntervalReport(payload);
      setGeneratedReport(report);
      setSuccess('Interval Audit Report successfully generated!');
      if (onRefreshAll) {
        await onRefreshAll();
      }
    } catch (err) {
      setError(err.message || 'Failed to generate audit report.');
    } finally {
      setGenerating(false);
    }
  };

  const getDeliveriesSum = (itemId) => {
    return deliveries
      .filter(d => d.rawItemId === itemId)
      .reduce((sum, curr) => sum + curr.quantity, 0);
  };

  // Variance statistics for report view
  const auditStats = () => {
    if (!generatedReport || !generatedReport.variance) return { total: 0, losses: 0, overages: 0, perfect: 0, netLoss: 0 };
    let total = generatedReport.variance.length;
    let losses = 0;
    let overages = 0;
    let perfect = 0;
    let netLoss = 0;

    generatedReport.variance.forEach(v => {
      const val = v.varianceValue;
      if (val < -0.05) {
        losses++;
        netLoss += Math.abs(val);
      } else if (val > 0.05) {
        overages++;
      } else {
        perfect++;
      }
    });

    return { total, losses, overages, perfect, netLoss };
  };

  // Filtered ingredients audit rows
  const getFilteredAuditRows = () => {
    if (!generatedReport || !generatedReport.variance) return [];
    return generatedReport.variance.filter(v => {
      const val = v.varianceValue;
      if (activeFilter === 'loss') return val < -0.05;
      if (activeFilter === 'overage') return val > 0.05;
      if (activeFilter === 'ontarget') return Math.abs(val) <= 0.05;
      if (activeFilter === 'variance') return Math.abs(val) > 0.05;
      return true;
    });
  };

  const { total, losses, overages, perfect, netLoss } = auditStats();
  const filteredAuditRows = getFilteredAuditRows();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Title */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Variance Audit Reports</h1>
          <p className="page-subtitle">Configure interval audits, parse invoices, and audit lost vs sold inventory</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.9rem', padding: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.9rem', padding: '1rem' }}>
          {success}
        </div>
      )}

      {generatedReport ? (
        /* ================= RESULTS VIEW ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setGeneratedReport(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}
              >
                <X size={16} /> Close Report
              </button>
              <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
                Audit Period Results: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </h2>
            </div>
          </div>

          {/* Audit Stats Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'all' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('all')}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{total}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audited Ingredients</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'loss' ? '2px solid var(--danger)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('loss')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{losses}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loss Count (Shortage)</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'overage' ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('overage')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{overages}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overage Count</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'ontarget' ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('ontarget')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{perfect}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>On Target</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: netLoss > 0 ? 'var(--danger)' : '#fff' }}>-{netLoss.toFixed(1)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Net Loss Qty</div>
            </div>
          </div>

          {/* Results Table */}
          <div className="card" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <button className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('all')}>All Items</button>
              <button className={`btn ${activeFilter === 'variance' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('variance')}>Discrepancies</button>
              <button className={`btn ${activeFilter === 'loss' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('loss')}>Losses</button>
              <button className={`btn ${activeFilter === 'overage' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('overage')}>Overages</button>
              <button className={`btn ${activeFilter === 'ontarget' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('ontarget')}>On Target</button>
            </div>

            <div className="table-container">
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Unit</th>
                    <th style={{ textAlign: 'right' }}>Start Stock</th>
                    <th style={{ textAlign: 'right' }}>Deliveries</th>
                    <th style={{ textAlign: 'right' }}>End Stock</th>
                    <th style={{ textAlign: 'right' }}>Used</th>
                    <th style={{ textAlign: 'right' }}>Sold (Recipe)</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Lost (Variance)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditRows.map(v => {
                    const name = v.rawItemId?.name || 'Unknown';
                    const unit = v.rawItemId?.unit || '';
                    const startVal = v.initial;
                    // Deliveries calculated back
                    const endVal = v.actualFinal;
                    const soldVal = v.usage;
                    const lostVal = v.varianceValue;
                    const deliveryVal = Math.max(0, expectedFinalValueFromRaw(v));
                    const usedVal = (startVal + deliveryVal) - endVal;

                    function expectedFinalValueFromRaw(item) {
                      // Expectation: expectedFinal = start + delivery - sold
                      // Let's resolve deliveries
                      const idStr = (item.rawItemId._id || item.rawItemId).toString();
                      const sessDelivery = generatedReport.deliveries?.find(d => d.rawItemId._id === idStr || d.rawItemId === idStr);
                      return sessDelivery ? sessDelivery.quantity : 0;
                    }

                    return (
                      <tr key={v._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{unit}</span>
                        </td>
                        <td data-label="Start Stock" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{startVal.toFixed(1)}</td>
                        <td data-label="Deliveries" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{deliveryVal.toFixed(1)}</td>
                        <td data-label="End Stock" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{endVal.toFixed(1)}</td>
                        <td data-label="Used" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{usedVal.toFixed(1)}</td>
                        <td data-label="Sold" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{soldVal.toFixed(1)}</td>
                        <td data-label="Lost" style={{ textAlign: 'center' }}>
                          {lostVal > 0.05 ? (
                            <span className="badge" style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontWeight: 600 }}>
                              +{lostVal.toFixed(1)}
                            </span>
                          ) : lostVal < -0.05 ? (
                            <span className="badge" style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontWeight: 600 }}>
                              {lostVal.toFixed(1)}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>0.0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SETUP / CONFIGURE AUDIT FORM ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Inputs Panel: Dates & Reports */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Step 1: Date Range Setup */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={18} style={{ color: 'var(--primary)' }} /> 1. Select Period Dates
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date (Load Starting Inventory)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date (Run Current Audit)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {loadingStartingCounts ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching database starting records...</div>
              ) : (
                <div style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  {startingCountsMessage}
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPeriodCountsModalOpen(true)}
                disabled={!startDate || !endDate}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem', width: '100%', borderColor: 'rgba(255,255,255,0.1)', marginTop: '0.5rem' }}
              >
                <Clipboard size={15} style={{ color: 'var(--primary)' }} /> Show Inventory of That Date Range
              </button>
            </div>

            {/* Step 2: Upload Invoices (Deliveries) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={18} style={{ color: 'var(--primary)' }} /> 2. Upload Delivery Invoices
              </h3>

              <div 
                className="upload-dropzone" 
                onClick={() => !parsingInvoice && document.getElementById('invoice-input').click()}
                style={{ padding: '1.75rem 1rem', cursor: parsingInvoice ? 'not-allowed' : 'pointer' }}
              >
                <Upload className="upload-icon" style={{ height: '32px', width: '32px', marginBottom: '0.25rem' }} />
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                  {parsingInvoice ? 'AI extracting invoice...' : 'Upload Invoice PDF / Image'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>
                  Parsed by Gemini for quantities and prices
                </p>
                <input
                  id="invoice-input"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleInvoiceUpload}
                  disabled={parsingInvoice}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Delivery list summary */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Added Deliveries ({deliveries.length})</h4>
                {deliveries.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No delivery items added yet.</p>
                ) : (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {deliveries.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContext: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <div style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ marginRight: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>+{item.quantity} {rawItems.find(r => r._id === item.rawItemId)?.unit || 'pcs'}</div>
                        <button
                          type="button"
                          onClick={() => setDeliveries(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Sales Report (CSV/Image) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} style={{ color: 'var(--primary)' }} /> 3. Sales Report Upload
              </h3>

              <div 
                className="upload-dropzone" 
                onClick={() => !parsingSales && document.getElementById('sales-input').click()}
                style={{ padding: '1.75rem 1rem', cursor: parsingSales ? 'not-allowed' : 'pointer' }}
              >
                <Upload className="upload-icon" style={{ height: '32px', width: '32px', marginBottom: '0.25rem' }} />
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                  {parsingSales ? 'AI parsing sales...' : 'Upload Sales Report / POS file'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>
                  Supports sales CSV, PDF, and image sales reports
                </p>
                <input
                  id="sales-input"
                  type="file"
                  accept=".csv,application/pdf,image/*"
                  onChange={handleSalesUpload}
                  disabled={parsingSales}
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Loaded Sales Entries ({salesData.length})</h4>
                {salesData.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No sales reports loaded.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Check size={14} />
                      <span style={{ fontWeight: 600 }}>{salesFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSalesData([]); setSalesFileName(''); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Highlights & Quick Setup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InventoryCalendar 
                sessions={sessions}
                onSelectDate={handleCalendarDateSelect}
              />
              
              <div className="card" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', padding: '0.75rem', background: 'rgba(18, 20, 26, 0.4)', border: 'var(--glass-border)', margin: 0 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Click date to set:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: calendarClickTarget === 'start' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: calendarClickTarget === 'start' ? 700 : 500 }}>
                  <input
                    type="radio"
                    name="calendarClickTarget"
                    checked={calendarClickTarget === 'start'}
                    onChange={() => setCalendarClickTarget('start')}
                    style={{ cursor: 'pointer' }}
                  />
                  Start Date
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: calendarClickTarget === 'end' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: calendarClickTarget === 'end' ? 700 : 500 }}>
                  <input
                    type="radio"
                    name="calendarClickTarget"
                    checked={calendarClickTarget === 'end'}
                    onChange={() => setCalendarClickTarget('end')}
                    style={{ cursor: 'pointer' }}
                  />
                  End Date
                </label>
              </div>
            </div>

          </div>

          {/* Step 4: Current stock counts (Ending stock count on end date) */}
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clipboard size={18} style={{ color: 'var(--primary)' }} /> 4. Enter Current Counts on {endDate}
            </h3>

            <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Unit</th>
                    <th>Start Stock</th>
                    <th>Deliveries</th>
                    <th>Current stock count</th>
                  </tr>
                </thead>
                <tbody>
                  {rawItems.map(item => {
                    const startQty = startingCounts[item._id] || 0;
                    const deliveryQty = getDeliveriesSum(item._id);

                    return (
                      <tr key={item._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{item.unit}</span>
                        </td>
                        <td data-label="Start Stock" style={{ color: 'var(--text-muted)' }}>{startQty} {item.unit}</td>
                        <td data-label="Deliveries" style={{ color: 'var(--success)', fontWeight: 500 }}>
                          {deliveryQty > 0 ? `+${deliveryQty} ${item.unit}` : '-'}
                        </td>
                        <td data-label="Current Stock">
                          {item.quantityPerBox > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                placeholder="Boxes"
                                className="input-field"
                                value={endingBoxesInput[item._id] || ''}
                                onChange={(e) => handleBoxesChange(item._id, e.target.value, item.quantityPerBox)}
                                style={{ maxWidth: '80px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>box +</span>
                              <input
                                type="number"
                                placeholder="Units"
                                className="input-field"
                                value={endingLooseInput[item._id] || ''}
                                onChange={(e) => handleLooseChange(item._id, e.target.value, item.quantityPerBox)}
                                style={{ maxWidth: '80px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>pcs</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginLeft: '0.5rem' }}>
                                (= {endingCounts[item._id] || 0} {item.unit})
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                placeholder="Loose Qty"
                                className="input-field"
                                value={endingLooseInput[item._id] || ''}
                                onChange={(e) => handleLooseChange(item._id, e.target.value, 0)}
                                style={{ maxWidth: '120px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleGenerateReport}
              className="btn btn-primary"
              disabled={generating || rawItems.length === 0}
              style={{ width: '100%', padding: '0.85rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={18} />
              {generating ? 'Processing Report & AI depleted variance...' : 'Generate Interval Audit Report'}
            </button>
          </div>

        </div>
      )}

      {/* ================= INVOICE GEMINI EXTRACTION MODAL ================= */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '640px', position: 'relative' }}>
            <button 
              onClick={() => setIsInvoiceModalOpen(false)} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Gemini Extracted Invoice Deliveries
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Review the extracted invoice items below. Map unmatched items to the correct raw ingredient database key before confirming.
            </p>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Extracted Description</th>
                    <th>Qty Received</th>
                    <th>Mapped Database Ingredient</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedInvoiceItems.map((item, idx) => (
                    <tr key={idx} style={{ background: item.rawItemId ? '' : 'rgba(239, 68, 68, 0.05)' }}>
                      <td data-label="Extracted Description">{item.name}</td>
                      <td data-label="Qty Received">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...extractedInvoiceItems];
                            updated[idx].quantity = Number(e.target.value) || 0;
                            setExtractedInvoiceItems(updated);
                          }}
                          className="input-field"
                          style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                        />
                      </td>
                      <td data-label="Mapped Ingredient">
                        <select
                          className="input-field"
                          value={item.rawItemId || ''}
                          onChange={(e) => {
                            const updated = [...extractedInvoiceItems];
                            updated[idx].rawItemId = e.target.value || null;
                            setExtractedInvoiceItems(updated);
                          }}
                          style={{ fontSize: '0.75rem', padding: '0.2rem', height: '28px', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                        >
                          <option value="">-- Unmapped / Skip Item --</option>
                          {rawItems.map(raw => (
                            <option key={raw._id} value={raw._id}>{raw.name} ({raw.unit})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirmInvoice}>Confirm & Add Deliveries</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SALES REPORT GEMINI EXTRACTION MODAL ================= */}
      {isSalesModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '640px', position: 'relative' }}>
            <button 
              onClick={() => setIsSalesModalOpen(false)} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Gemini Extracted POS Sales Report
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Review the extracted quantities sold. Map items to their matching POS recipe SKU before importing.
            </p>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>SKU / Code</th>
                    <th>Menu Product Name</th>
                    <th>Quantity Sold</th>
                    <th>Sales Price ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedSalesItems.map((item, idx) => {
                    const matchedRecipe = recipes.find(r => r.menuItemSku === item.sku);

                    return (
                      <tr key={idx} style={{ background: matchedRecipe ? '' : 'rgba(245, 158, 11, 0.05)' }}>
                        <td data-label="SKU">
                          <select
                            value={item.sku || ''}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].sku = e.target.value;
                              const match = recipes.find(r => r.menuItemSku === e.target.value);
                              if (match) {
                                updated[idx].name = match.menuItemName;
                              }
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ fontSize: '0.75rem', padding: '0.2rem', height: '28px', background: 'rgba(0,0,0,0.3)', width: '100%', maxWidth: '130px' }}
                          >
                            <option value="">-- No SKU --</option>
                            {recipes.map(rec => (
                              <option key={rec._id} value={rec.menuItemSku}>{rec.menuItemSku} ({rec.menuItemName})</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Menu Product Name">{item.name}</td>
                        <td data-label="Quantity Sold">
                          <input
                            type="number"
                            value={item.quantitySold}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].quantitySold = Number(e.target.value) || 0;
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td data-label="Sales Price">
                          <input
                            type="number"
                            step="any"
                            value={item.price}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].price = Number(e.target.value) || 0;
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ maxWidth: '80px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsSalesModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirmSales}>Confirm & Import Sales</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PERIOD INVENTORY COUNTS POPUP REPORT ================= */}
      {isPeriodCountsModalOpen && (() => {
        // Filter sessions within startDate and endDate
        const sessionsInRange = sessions.filter(sess => {
          if (!sess.date || !startDate || !endDate) return false;
          const sDate = new Date(startDate);
          sDate.setUTCHours(0,0,0,0);
          const eDate = new Date(endDate);
          eDate.setUTCHours(0,0,0,0);
          const sessDate = new Date(sess.date);
          sessDate.setUTCHours(0,0,0,0);
          return sessDate.getTime() >= sDate.getTime() && sessDate.getTime() <= eDate.getTime();
        });

        // Filter sessions that have actual counts logged
        const sessionsWithCounts = sessionsInRange.filter(sess => {
          const hasCounts = (sess.actualFinalInventory && sess.actualFinalInventory.some(i => i.quantity > 0)) ||
                            (sess.initialInventory && sess.initialInventory.some(i => i.quantity > 0));
          return hasCounts;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        const getSessionItemCount = (sess, itemId) => {
          const inventoryToUse = sess.actualFinalInventory && sess.actualFinalInventory.length > 0
            ? sess.actualFinalInventory
            : sess.initialInventory;
          const match = inventoryToUse.find(i => {
            const rawId = i.rawItemId?._id || i.rawItemId;
            return rawId?.toString() === itemId.toString();
          });
          return match ? match.quantity : 0;
        };

        const getSessionDeliveries = (sess, itemId) => {
          if (!sess.deliveries) return 0;
          const match = sess.deliveries.find(d => {
            const rawId = d.rawItemId?._id || d.rawItemId;
            return rawId?.toString() === itemId.toString();
          });
          return match ? match.quantity : 0;
        };

        const getPeriodDeliveriesSum = (itemId) => {
          return sessionsInRange.reduce((sum, sess) => {
            return sum + getSessionDeliveries(sess, itemId);
          }, 0);
        };

        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '850px', width: '95%', position: 'relative', background: 'rgba(18, 20, 26, 0.95)', backdropFilter: 'blur(20px)', border: 'var(--glass-border)' }}>
              <button 
                onClick={() => setIsPeriodCountsModalOpen(false)} 
                style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              
              <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clipboard size={20} style={{ color: 'var(--primary)' }} /> Inventory of Date Range
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Period Selected: <span style={{ color: '#fff', fontWeight: 600 }}>{startDate}</span> to <span style={{ color: '#fff', fontWeight: 600 }}>{endDate}</span>
              </p>

              {sessionsWithCounts.length === 0 && sessionsInRange.every(s => !s.deliveries || s.deliveries.every(d => d.quantity === 0)) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <ShieldAlert size={36} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No inventory counts or deliveries were logged within this selected range.</p>
                </div>
              ) : (
                <>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Unit</th>
                          {sessionsWithCounts.map((sess, sIdx) => {
                            const formattedDate = new Date(sess.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            return <th key={sess._id || sIdx} style={{ textAlign: 'right' }}>{formattedDate}</th>;
                          })}
                          <th style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>Total Deliveries Sum</th>
                          <th style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>Total Counts Sum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawItems.map(item => {
                          const rowTotal = sessionsWithCounts.reduce((sum, sess) => {
                            return sum + getSessionItemCount(sess, item._id);
                          }, 0);
                          const deliveryTotal = getPeriodDeliveriesSum(item._id);

                          return (
                            <tr key={item._id}>
                              <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                              <td data-label="Unit">
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  {item.unit}
                                </span>
                              </td>
                              {sessionsWithCounts.map((sess, sIdx) => {
                                const qty = getSessionItemCount(sess, item._id);
                                return (
                                  <td key={sess._id || sIdx} data-label={new Date(sess.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} style={{ textAlign: 'right', color: qty > 0 ? '#fff' : 'var(--text-muted)' }}>
                                    {qty.toFixed(1)}
                                  </td>
                                );
                              })}
                              <td data-label="Total Deliveries Sum" style={{ textAlign: 'right', fontWeight: 700, color: deliveryTotal > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                {deliveryTotal.toFixed(1)}
                              </td>
                              <td data-label="Total Counts Sum" style={{ textAlign: 'right', fontWeight: 700, color: rowTotal > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {rowTotal.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ minWidth: '120px' }} onClick={() => setIsPeriodCountsModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
