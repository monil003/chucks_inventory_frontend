import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { 
  BarChart3, Package, BookOpen, AlertTriangle, CheckCircle, Calendar, 
  Trash2, Eye, ArrowLeft, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Clipboard, Upload, CheckCircle2, XCircle, Clock
} from 'lucide-react';

export default function Dashboard({ sessions, rawItems, recipes, onDeleteSession, onViewTab }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [detailsSearchQuery, setDetailsSearchQuery] = useState('');
  const [detailsCurrentPage, setDetailsCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'variance', 'loss', 'overage', 'ontarget'
  const itemsPerPage = 25;

  // Find session for selected Date
  const dateSession = useMemo(() => {
    if (!selectedDate) return null;
    const target = new Date(selectedDate);
    target.setUTCHours(0,0,0,0);
    return sessions.find(s => {
      const d = new Date(s.date);
      d.setUTCHours(0,0,0,0);
      return d.getTime() === target.getTime();
    }) || null;
  }, [sessions, selectedDate]);

  // Compute basic stats
  const completedSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'completed');
  }, [sessions]);

  const stats = useMemo(() => {
    let totalShortage = 0;
    if (dateSession && dateSession.status === 'completed') {
      dateSession.variance.forEach(v => {
        if (v.varianceValue < 0) {
          totalShortage += Math.abs(v.varianceValue);
        }
      });
    }

    return {
      sessionsCount: completedSessions.length,
      itemsCount: rawItems.length,
      recipesCount: recipes.length,
      latestShortage: totalShortage
    };
  }, [completedSessions, rawItems, recipes, dateSession]);

  // Format chart data for the selected session
  const dateSessionChartData = useMemo(() => {
    if (!dateSession || !dateSession.variance) return [];
    return dateSession.variance.map(v => ({
      name: v.rawItemId?.name || 'Unknown',
      variance: v.varianceValue,
      expected: v.expectedFinal,
      actual: v.actualFinal
    })).filter(d => Math.abs(d.variance) > 0); // only show items with variance
  }, [dateSession]);

  // Aggregate historical variance trend data
  const historicalTrendData = useMemo(() => {
    const list = [...completedSessions].slice(0, 10).reverse();
    return list.map(session => {
      const dataPoint = {
        date: new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
      session.variance.forEach(v => {
        if (v.rawItemId) {
          dataPoint[v.rawItemId.name] = v.varianceValue;
        }
      });
      return dataPoint;
    });
  }, [completedSessions]);

  // Verification helper flags for selected date
  const isStartCountDone = useMemo(() => {
    return !!(dateSession && dateSession.initialInventory && dateSession.initialInventory.some(i => i.quantity > 0));
  }, [dateSession]);

  const isSalesUploaded = useMemo(() => {
    return !!(dateSession && dateSession.salesFile);
  }, [dateSession]);

  const isEndCountDone = useMemo(() => {
    return !!(dateSession && dateSession.actualFinalInventory && dateSession.actualFinalInventory.some(i => i.quantity > 0));
  }, [dateSession]);

  const showSelectedVariance = isStartCountDone && isSalesUploaded && isEndCountDone;

  const handleExportCSV = (sess) => {
    if (!sess) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ingredient,Unit,Initial Count,Sold,Expected Remaining,Actual Count,Lost\n";
    sess.variance.forEach(v => {
      const name = v.rawItemId?.name || 'Unknown';
      const unit = v.rawItemId?.unit || '';
      csvContent += `"${name.replace(/"/g, '""')}",${unit},${v.initial},${v.usage},${v.expectedFinal},${v.actualFinal},${v.varianceValue}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_variance_${sess.date.split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeAuditSession = selectedHistorySession || (showSelectedVariance ? dateSession : null);

  if (activeAuditSession) {
    let totalItems = activeAuditSession.variance.length;
    let shortageCount = 0;
    let overageCount = 0;
    let onTargetCount = 0;
    let totalLoss = 0;

    activeAuditSession.variance.forEach(v => {
      const val = v.varianceValue;
      if (val < -0.05) {
        shortageCount++;
        totalLoss += Math.abs(val);
      } else if (val > 0.05) {
        overageCount++;
      } else {
        onTargetCount++;
      }
    });

    const filteredDetails = activeAuditSession.variance.filter(v => {
      const name = v.rawItemId?.name || 'Unknown';
      const matchesSearch = name.toLowerCase().includes(detailsSearchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const val = v.varianceValue;
      if (activeFilter === 'variance') {
        return Math.abs(val) > 0.05;
      }
      if (activeFilter === 'loss') {
        return val < -0.05;
      }
      if (activeFilter === 'overage') {
        return val > 0.05;
      }
      if (activeFilter === 'ontarget') {
        return Math.abs(val) <= 0.05;
      }
      return true; // 'all'
    });

    const totalPagesDetails = Math.ceil(filteredDetails.length / itemsPerPage) || 1;
    const activePageDetails = Math.min(detailsCurrentPage, totalPagesDetails);
    const startIndexDetails = (activePageDetails - 1) * itemsPerPage;
    const paginatedDetails = filteredDetails.slice(startIndexDetails, startIndexDetails + itemsPerPage);

    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setSelectedHistorySession(null);
                setDetailsSearchQuery('');
                setDetailsCurrentPage(1);
                setActiveFilter('all');
              }} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="page-title">
              Audit Results - {new Date(activeAuditSession.date).toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Sales CSV File: <span style={{ color: '#fff', fontStyle: 'italic' }}>{activeAuditSession.salesFile || 'Manual Entry'}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExportCSV(activeAuditSession)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderColor: 'var(--primary-glow)' }}
          >
            <FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} /> Export Results to CSV
          </button>
        </div>

        {/* Audit Stats Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            className="card" 
            onClick={() => { setActiveFilter('all'); setDetailsCurrentPage(1); }}
            style={{ 
              padding: '1.25rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: activeFilter === 'all' ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{totalItems}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Audited Items</div>
          </div>
          <div 
            className="card" 
            onClick={() => { setActiveFilter('loss'); setDetailsCurrentPage(1); }}
            style={{ 
              padding: '1.25rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              background: shortageCount > 0 ? 'var(--danger-glow)' : 'rgba(255, 255, 255, 0.02)', 
              border: activeFilter === 'loss' ? '2px solid var(--danger)' : (shortageCount > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)'),
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: shortageCount > 0 ? 'var(--danger)' : '#fff' }}>{shortageCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Loss Count</div>
          </div>
          <div 
            className="card" 
            onClick={() => { setActiveFilter('overage'); setDetailsCurrentPage(1); }}
            style={{ 
              padding: '1.25rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              background: overageCount > 0 ? 'var(--success-glow)' : 'rgba(255, 255, 255, 0.02)', 
              border: activeFilter === 'overage' ? '2px solid var(--success)' : (overageCount > 0 ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)'),
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: overageCount > 0 ? 'var(--success)' : '#fff' }}>{overageCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Overage Count</div>
          </div>
          <div 
            className="card" 
            onClick={() => { setActiveFilter('ontarget'); setDetailsCurrentPage(1); }}
            style={{ 
              padding: '1.25rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              border: activeFilter === 'ontarget' ? '2px solid var(--success)' : '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{onTargetCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase' }}>On Target</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: totalLoss > 0 ? 'var(--danger)' : '#fff' }}>-{totalLoss.toFixed(1)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Total Net Loss</div>
          </div>
        </div>

        <div className="card" style={{ overflow: 'visible' }}>
          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clipboard size={20} style={{ color: 'var(--primary)' }} /> Variance Report Details
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              onClick={() => { setActiveFilter('all'); setDetailsCurrentPage(1); }}
            >
              All Items ({totalItems})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'variance' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: activeFilter === 'variance' ? '' : 'rgba(249, 115, 22, 0.15)', color: activeFilter === 'variance' ? '' : 'var(--primary)' }}
              onClick={() => { setActiveFilter('variance'); setDetailsCurrentPage(1); }}
            >
              Discrepancies Only ({shortageCount + overageCount})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'loss' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: activeFilter === 'loss' ? '' : 'rgba(239, 68, 68, 0.15)', color: activeFilter === 'loss' ? '' : 'var(--danger)' }}
              onClick={() => { setActiveFilter('loss'); setDetailsCurrentPage(1); }}
            >
              Losses ({shortageCount})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'overage' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: activeFilter === 'overage' ? '' : 'rgba(16, 185, 129, 0.15)', color: activeFilter === 'overage' ? '' : 'var(--success)' }}
              onClick={() => { setActiveFilter('overage'); setDetailsCurrentPage(1); }}
            >
              Overages ({overageCount})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'ontarget' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: activeFilter === 'ontarget' ? '' : 'rgba(16, 185, 129, 0.15)', color: activeFilter === 'ontarget' ? '' : 'var(--success)' }}
              onClick={() => { setActiveFilter('ontarget'); setDetailsCurrentPage(1); }}
            >
              On Target ({onTargetCount})
            </button>
          </div>

          <div className="search-container" style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={18} />
            <input
              type="text"
              placeholder="Search audited ingredients..."
              className="input-field"
              value={detailsSearchQuery}
              onChange={(e) => { setDetailsSearchQuery(e.target.value); setDetailsCurrentPage(1); }}
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
                  <th style={{ textAlign: 'right' }}>Sold</th>
                  <th style={{ textAlign: 'right' }}>Expected Remaining</th>
                  <th style={{ textAlign: 'right' }}>Actual Count</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Lost</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDetails.map(v => {
                  const name = v.rawItemId?.name || 'Unknown';
                  const unit = v.rawItemId?.unit || '';
                  const diff = v.varianceValue;

                  return (
                    <tr key={v._id}>
                      <td data-label="Ingredient" style={{ fontWeight: 600 }}>{name}</td>
                      <td data-label="Unit">
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {unit}
                        </span>
                      </td>
                      <td data-label="Initial Count" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{v.initial.toFixed(1)}</td>
                      <td data-label="Sold" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{v.usage.toFixed(1)}</td>
                      <td data-label="Exp. Remaining" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{v.expectedFinal.toFixed(1)}</td>
                      <td data-label="Actual Count" style={{ textAlign: 'right', fontWeight: 600 }}>{v.actualFinal.toFixed(1)}</td>
                      <td data-label="Lost" style={{ textAlign: 'center' }}>
                        {diff > 0.05 ? (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPagesDetails > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Showing {startIndexDetails + 1} - {Math.min(startIndexDetails + itemsPerPage, filteredDetails.length)} of {filteredDetails.length} ingredients
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  disabled={activePageDetails === 1}
                  onClick={() => setDetailsCurrentPage(activePageDetails - 1)}
                >
                  Prev
                </button>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                  Page {activePageDetails} of {totalPagesDetails}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  disabled={activePageDetails === totalPagesDetails}
                  onClick={() => setDetailsCurrentPage(activePageDetails + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view animate-fade-in">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Inventory summaries, daily cycle tracking, and spoilage variance reports</p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(18,20,26,0.5)', padding: '0.5rem 1rem', borderRadius: '12px', border: 'var(--glass-border)' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Date:</span>
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

      {/* Audit Progress Tracking Section */}
      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Daily Audit Tracker: {selectedDate}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Check and execute the required stages to generate the variance analysis report for this date
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Stage 1: Starting Stock */}
          <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', background: isStartCountDone ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>Stage 1</span>
              {isStartCountDone ? (
                <span className="badge badge-success"><CheckCircle size={10} /> Done</span>
              ) : (
                <span className="badge badge-warning"><Clock size={10} /> Pending</span>
              )}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Day Start Count</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1 }}>Opening stock counts entered for auditing.</p>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.4rem', width: '100%' }}
              onClick={() => onViewTab('inventory-count')}
            >
              {isStartCountDone ? 'Modify Counts' : 'Enter Starting Stock'}
            </button>
          </div>

          {/* Stage 2: POS Sales */}
          <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', background: isSalesUploaded ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>Stage 2</span>
              {isSalesUploaded ? (
                <span className="badge badge-success"><CheckCircle size={10} /> Done</span>
              ) : (
                <span className="badge badge-warning"><Clock size={10} /> Pending</span>
              )}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Day End Sales POS</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1 }}>Sales file uploaded to calculate portion depletion.</p>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.4rem', width: '100%' }}
              onClick={() => onViewTab('end-sales')}
            >
              {isSalesUploaded ? 'Upload Different POS' : 'Upload POS CSV'}
            </button>
          </div>

          {/* Stage 3: Day End Count */}
          <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', background: isEndCountDone ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>Stage 3</span>
              {isEndCountDone ? (
                <span className="badge badge-success"><CheckCircle size={10} /> Done</span>
              ) : (
                <span className="badge badge-warning"><Clock size={10} /> Pending</span>
              )}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Day End Count</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1 }}>Actual final stock counts entered for audit comparison.</p>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.4rem', width: '100%' }}
              onClick={() => onViewTab('inventory-count')}
            >
              {isEndCountDone ? 'Modify Final Counts' : 'Enter Closing Stock'}
            </button>
          </div>
        </div>
      </div>

      {/* Show Variance Analytics if completed */}
      {showSelectedVariance ? (
        <>
          <div className="stats-card-container">
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Calendar size={24} />
              </div>
              <div>
                <div className="stat-label">Total Days Audited</div>
                <div className="stat-value">{stats.sessionsCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
                <Package size={24} />
              </div>
              <div>
                <div className="stat-label">Tracked Items</div>
                <div className="stat-value">{stats.itemsCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <div className="stat-label">Portion Recipes</div>
                <div className="stat-value">{stats.recipesCount}</div>
              </div>
            </div>

            <div className="stat-card">
              {stats.latestShortage > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="stat-label">Shortage Loss ({selectedDate})</div>
                    <div className="stat-value text-danger" style={{ color: 'var(--danger)' }}>-{stats.latestShortage.toFixed(1)}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div className="stat-label">Status ({selectedDate})</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>Balanced</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '0.85rem' }} 
              onClick={() => setSelectedHistorySession(null)}
            >
              <Eye size={16} /> Load Interactive Audit Details for {selectedDate}
            </button>
          </div>

          {/* Variance Chart */}
          {dateSessionChartData.length > 0 && (
            <div className="card" style={{ marginBottom: '2.5rem' }}>
              <h2 className="form-label" style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} className="text-primary" /> Variance Analysis for {selectedDate} (Items with Discrepancies)
              </h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={dateSessionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="variance" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center" style={{ padding: '3rem 2rem', marginBottom: '2.5rem' }}>
          <AlertTriangle size={36} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Variance Data Pending for {selectedDate}</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
            To generate and view the variance audit report for this date, please complete all three tracking stages (Day Start Count, POS Sales CSV upload, and Day End Count).
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!isStartCountDone && (
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => onViewTab('inventory-count')}>
                Enter Opening counts
              </button>
            )}
            {!isSalesUploaded && (
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => onViewTab('end-sales')}>
                Upload POS report
              </button>
            )}
            {isStartCountDone && isSalesUploaded && !isEndCountDone && (
              <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => onViewTab('inventory-count')}>
                Enter Closing counts
              </button>
            )}
          </div>
        </div>
      )}

      {/* Historical logs */}
      <div className="card">
        <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Audit Log History</h2>
        {completedSessions.length > 0 ? (
          <div className="table-container">
            <table className="custom-table responsive-table">
              <thead>
                <tr>
                  <th>Audit Date</th>
                  <th>POS File</th>
                  <th>Ingredients Audited</th>
                  <th>Variance Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedSessions.map(session => {
                  const hasShortage = session.variance.some(v => v.varianceValue < -0.05);
                  const isPerfect = session.variance.every(v => Math.abs(v.varianceValue) <= 0.05);

                  return (
                    <tr key={session._id}>
                      <td data-label="Audit Date" style={{ fontWeight: 600 }}>
                        {new Date(session.date).toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td data-label="POS File" style={{ color: '#fff', fontStyle: 'italic' }}>
                        {session.salesFile || 'Manual Entry'}
                      </td>
                      <td data-label="Ingredients Audited">
                        {session.variance.length} ingredients
                      </td>
                      <td data-label="Variance Status">
                        {isPerfect ? (
                          <span className="badge badge-success">No Variance</span>
                        ) : hasShortage ? (
                          <span className="badge badge-danger">Shortage / Spoilage</span>
                        ) : (
                          <span className="badge badge-warning">Overage</span>
                        )}
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                            onClick={() => {
                              setSelectedHistorySession(session);
                              setDetailsSearchQuery('');
                              setDetailsCurrentPage(1);
                            }}
                          >
                            <Eye size={15} style={{ color: 'var(--primary)' }} /> View Audit
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this historical inventory log?')) {
                                onDeleteSession(session._id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No completed audit session logs available.</p>
        )}
      </div>
    </div>
  );
}
