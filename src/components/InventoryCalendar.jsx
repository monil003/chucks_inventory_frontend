import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clipboard, ShoppingCart } from 'lucide-react';

export default function InventoryCalendar({ 
  sessions = [], 
  onSelectDate, 
  selectedDate, 
  selectedStartDate, 
  selectedEndDate, 
  compact = false 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get month name
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Get first day of the month (0 = Sunday, ..., 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get number of days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Parse sessions into maps for quick lookup
  const sessionStatusMap = {};
  sessions.forEach(sess => {
    if (!sess.date) return;
    const dateStr = new Date(sess.date).toISOString().split('T')[0];
    
    const hasCounts = (sess.actualFinalInventory && sess.actualFinalInventory.some(i => i.quantity > 0)) ||
                      (sess.initialInventory && sess.initialInventory.some(i => i.quantity > 0));
    const hasDeliveries = sess.deliveries && sess.deliveries.some(d => d.quantity > 0);
    const hasSales = sess.salesData && sess.salesData.some(s => s.quantitySold > 0);

    if (!sessionStatusMap[dateStr]) {
      sessionStatusMap[dateStr] = { hasCounts, hasDeliveries, hasSales };
    } else {
      sessionStatusMap[dateStr].hasCounts = sessionStatusMap[dateStr].hasCounts || hasCounts;
      sessionStatusMap[dateStr].hasDeliveries = sessionStatusMap[dateStr].hasDeliveries || hasDeliveries;
      sessionStatusMap[dateStr].hasSales = sessionStatusMap[dateStr].hasSales || hasSales;
    }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Build calendar days array
  const calendarCells = [];
  
  // Fill empty slots for days of previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }

  // Fill days of the current month
  for (let day = 1; day <= totalDays; day++) {
    calendarCells.push(day);
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card" style={{ 
      padding: compact ? '0.5rem' : '1.25rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: compact ? '0.4rem' : '1rem', 
      background: 'rgba(18, 20, 26, 0.4)', 
      border: 'var(--glass-border)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: compact ? '0.8rem' : '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {monthName} {year}
        </h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            type="button" 
            onClick={handlePrevMonth} 
            className="btn btn-secondary" 
            style={{ padding: compact ? '0.1rem 0.25rem' : '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <ChevronLeft size={compact ? 12 : 16} />
          </button>
          <button 
            type="button" 
            onClick={handleNextMonth} 
            className="btn btn-secondary" 
            style={{ padding: compact ? '0.1rem 0.25rem' : '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <ChevronRight size={compact ? 12 : 16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: compact ? '0.2rem' : '0.35rem', textAlign: 'center' }}>
        {daysOfWeek.map(d => (
          <div key={d} style={{ fontSize: compact ? '0.65rem' : '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {compact ? d.substring(0, 2) : d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: compact ? '0.2rem' : '0.35rem' }}>
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ height: compact ? '24px' : '34px' }} />;
          }

          // Format cell date
          const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dateObj = new Date(year, month, day);
          
          const status = sessionStatusMap[localDateStr] || { hasCounts: false, hasDeliveries: false, hasSales: false };
          const isToday = new Date().toDateString() === dateObj.toDateString();
          
          // Selection logic
          const isSelected = selectedDate === localDateStr;
          const isRangeStart = selectedStartDate === localDateStr;
          const isRangeEnd = selectedEndDate === localDateStr;
          const isInRange = selectedStartDate && selectedEndDate && 
                           localDateStr >= selectedStartDate && localDateStr <= selectedEndDate;
          
          const highlightActive = isSelected || isRangeStart || isRangeEnd;

          let bg = 'rgba(255, 255, 255, 0.02)';
          let borderStyle = '1px solid rgba(255, 255, 255, 0.03)';
          
          if (highlightActive) {
            bg = 'rgba(249, 115, 22, 0.25)';
            borderStyle = '2px solid var(--primary)';
          } else if (isInRange) {
            bg = 'rgba(249, 115, 22, 0.12)';
            borderStyle = '1px dashed rgba(249, 115, 22, 0.5)';
          } else if (isToday) {
            bg = 'rgba(249, 115, 22, 0.15)';
            borderStyle = '1px solid var(--primary)';
          }

          return (
            <div
              key={`day-${day}`}
              onClick={() => onSelectDate && onSelectDate(localDateStr)}
              style={{
                height: compact ? '24px' : '34px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: compact ? '6px' : '8px',
                background: bg,
                border: borderStyle,
                cursor: 'pointer',
                position: 'relative',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = bg;
                e.currentTarget.style.borderColor = highlightActive ? 'var(--primary)' : (isToday ? 'var(--primary)' : 'rgba(255,255,255,0.03)');
              }}
            >
              {/* Day Number */}
              <span style={{ 
                fontSize: compact ? '0.65rem' : '0.8rem', 
                fontWeight: (isToday || highlightActive) ? 700 : 500, 
                color: (isToday || highlightActive) ? 'var(--primary)' : '#fff',
                transform: compact ? 'translateY(-3px)' : 'none'
              }}>
                {day}
              </span>

              {/* Status Indicator Dots */}
              <div style={{ 
                display: 'flex', 
                gap: compact ? '1px' : '2px', 
                position: 'absolute', 
                bottom: compact ? '1px' : '3px' 
              }}>
                {status.hasCounts && (
                  <span 
                    style={{ width: compact ? '3px' : '4px', height: compact ? '3px' : '4px', borderRadius: '50%', background: 'var(--success)' }} 
                    title="Stock count logged"
                  />
                )}
                {status.hasDeliveries && (
                  <span 
                    style={{ width: compact ? '3px' : '4px', height: compact ? '3px' : '4px', borderRadius: '50%', background: '#3b82f6' }} 
                    title="Deliveries/Invoices logged"
                  />
                )}
                {status.hasSales && (
                  <span 
                    style={{ width: compact ? '3px' : '4px', height: compact ? '3px' : '4px', borderRadius: '50%', background: '#a855f7' }} 
                    title="Sales data logged"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: compact ? '0.5rem' : '0.75rem', 
        marginTop: compact ? '0.1rem' : '0.25rem', 
        fontSize: compact ? '0.6rem' : '0.65rem', 
        color: 'var(--text-secondary)', 
        flexWrap: 'wrap' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ width: compact ? '4px' : '6px', height: compact ? '4px' : '6px', borderRadius: '50%', background: 'var(--success)' }} />
          Count
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ width: compact ? '4px' : '6px', height: compact ? '4px' : '6px', borderRadius: '50%', background: '#3b82f6' }} />
          Deliv
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ width: compact ? '4px' : '6px', height: compact ? '4px' : '6px', borderRadius: '50%', background: '#a855f7' }} />
          Sales
        </div>
      </div>
    </div>
  );
}
