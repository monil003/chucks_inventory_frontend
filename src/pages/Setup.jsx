import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserPlus, Plus, Store, Users, CheckCircle, Clock, ShieldAlert, KeyRound } from 'lucide-react';

export default function Setup({ activeRestaurant, currentUser, onRefreshUser }) {
  const [staffList, setStaffList] = useState([]);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [newRestName, setNewRestName] = useState('');
  
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [submittingRest, setSubmittingRest] = useState(false);
  
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [restError, setRestError] = useState('');
  const [restSuccess, setRestSuccess] = useState('');

  const loadStaff = async () => {
    if (!activeRestaurant) return;
    try {
      setLoadingStaff(true);
      setStaffError('');
      const list = await api.getStaffUsers(activeRestaurant._id);
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load staff list', err);
      setStaffError('Failed to fetch staff list.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [activeRestaurant]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    
    if (!staffUsername.trim() || !staffPassword.trim()) {
      setStaffError('Username and password are required');
      return;
    }
    
    if (!activeRestaurant) {
      setStaffError('Please select or approve a restaurant first');
      return;
    }
    
    setSubmittingStaff(true);
    try {
      await api.createStaffUser(staffUsername.trim(), staffPassword.trim(), activeRestaurant._id);
      setStaffSuccess(`Staff account "${staffUsername}" created successfully!`);
      setStaffUsername('');
      setStaffPassword('');
      loadStaff();
    } catch (err) {
      setStaffError(err.message || 'Failed to create staff account.');
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setRestError('');
    setRestSuccess('');
    
    if (!newRestName.trim()) {
      setRestError('Restaurant name is required');
      return;
    }
    
    setSubmittingRest(true);
    try {
      const newRest = await api.addRestaurant(newRestName.trim(), currentUser._id);
      setRestSuccess(`Restaurant "${newRest.name}" registered successfully! It is now pending admin approval.`);
      setNewRestName('');
      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err) {
      setRestError(err.message || 'Failed to add restaurant.');
    } finally {
      setSubmittingRest(false);
    }
  };

  return (
    <div className="setup-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Setup & Settings</h1>
          <p className="page-subtitle">Configure staff logins and register additional restaurants</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Staff Management Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Staff Credentials</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Create access logins for your kitchen & stock count team</p>
            </div>
          </div>

          {activeRestaurant ? (
            <div style={{ fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              Active Restaurant Context: <strong style={{ color: 'var(--text-primary)' }}>{activeRestaurant.name}</strong>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
              No active or approved restaurant selected. Approve or switch to a restaurant to add staff.
            </div>
          )}

          {staffError && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} />
              {staffError}
            </div>
          )}

          {staffSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} />
              {staffSuccess}
            </div>
          )}

          <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username / Email</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. staff_kitchen"
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value)}
                disabled={submittingStaff || !activeRestaurant}
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter login password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                disabled={submittingStaff || !activeRestaurant}
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingStaff || !activeRestaurant}
              style={{ padding: '0.75rem', width: '100%', marginTop: '0.5rem' }}
            >
              <UserPlus size={16} />
              {submittingStaff ? 'Creating Staff Account...' : 'Generate Staff Credentials'}
            </button>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Current Staff List</h3>
            {loadingStaff ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading staff accounts...</p>
            ) : staffList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No staff members created yet for this restaurant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {staffList.map(member => (
                  <div
                    key={member._id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{member.username}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <KeyRound size={12} />
                      Role: Staff
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Restaurant Directory Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' }}>
              <Store size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Restaurant</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Expand your business by registering another restaurant profile</p>
            </div>
          </div>

          {restError && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} />
              {restError}
            </div>
          )}

          {restSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} />
              {restSuccess}
            </div>
          )}

          <form onSubmit={handleAddRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Restaurant Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Bistro North Side"
                value={newRestName}
                onChange={(e) => setNewRestName(e.target.value)}
                disabled={submittingRest}
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingRest}
              style={{ padding: '0.75rem', width: '100%', marginTop: '0.5rem', background: 'var(--secondary-gradient)' }}
            >
              <Plus size={16} />
              {submittingRest ? 'Submitting Registration...' : 'Register Restaurant'}
            </button>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Your Registered Restaurants</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentUser.restaurants && currentUser.restaurants.length > 0 ? (
                currentUser.restaurants.map(r => (
                  <div
                    key={r._id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.name}</div>
                    <div>
                      {r.approved ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                          <CheckCircle size={10} /> Approved
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No restaurants found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
