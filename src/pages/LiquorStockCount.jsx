import React, { useState } from 'react';
import { Wine, Calendar, Search, Info } from 'lucide-react';

export default function LiquorStockCount() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data to make the placeholder look real and premium
  const sampleLiquorItems = [
    { id: '1', name: 'House Vodka 750ml', unit: 'bottle', qtyPerBox: 12, price: 15.00 },
    { id: '2', name: 'Premium Gin 1L', unit: 'bottle', qtyPerBox: 6, price: 28.50 },
    { id: '3', name: 'Bourbon Whiskey 750ml', unit: 'bottle', qtyPerBox: 12, price: 32.00 },
    { id: '4', name: 'Silver Tequila 750ml', unit: 'bottle', qtyPerBox: 6, price: 24.00 },
    { id: '5', name: 'Draft Beer Keg (Half Barrel)', unit: 'keg', qtyPerBox: 1, price: 85.00 },
    { id: '6', name: 'House Cabernet Sauvignon (Wine)', unit: 'bottle', qtyPerBox: 12, price: 10.50 }
  ];

  const filteredItems = sampleLiquorItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Liquor Stock Count</h1>
          <p className="page-subtitle">Enter and monitor the ending stock for liquor, kegs, and wine</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <input
            type="date"
            className="input-field"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Development Banner Info */}
      <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', flexShrink: 0 }}>
          <Wine size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Liquor Stock Sheet - Coming Soon</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This tab will host the liquor count entry sheet. You will be able to enter counts in boxes/cases and buffer bottles. The list below represents a design mockup of the columns and structure. Please coordinate with your manager to customize the fields and columns needed.
          </p>
        </div>
      </div>

      {/* Main Table Preview */}
      <div className="card" style={{ opacity: 0.85 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="form-label" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Liquor Items Preview ({sampleLiquorItems.length})</h2>
          
          <div className="form-group" style={{ position: 'relative', width: '100%', maxWidth: '280px', marginBottom: 0 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search liquor catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', paddingRight: '0.75rem', height: '36px', fontSize: '0.85rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table responsive-table">
            <thead>
              <tr>
                <th>Liquor Name</th>
                <th>Unit</th>
                <th>Case Size</th>
                <th>Cases Remaining</th>
                <th>Loose Bottles</th>
                <th style={{ textAlign: 'right' }}>Total Units</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td data-label="Liquor Name" style={{ fontWeight: 600 }}>{item.name}</td>
                  <td data-label="Unit">
                    <span className="badge" style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {item.unit}
                    </span>
                  </td>
                  <td data-label="Case Size">
                    {item.qtyPerBox > 1 ? `${item.qtyPerBox} per Case` : 'Single Unit'}
                  </td>
                  <td data-label="Cases Remaining">
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0"
                      disabled
                      style={{ maxWidth: '80px', height: '34px', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}
                    />
                  </td>
                  <td data-label="Loose Bottles">
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0"
                      disabled
                      style={{ maxWidth: '80px', height: '34px', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}
                    />
                  </td>
                  <td data-label="Total Units" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                    -
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
