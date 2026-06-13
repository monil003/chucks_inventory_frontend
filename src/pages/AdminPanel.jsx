import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, Store, CheckCircle, XCircle, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersData, restaurantsData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminRestaurants()
      ]);
      setUsers(usersData);
      setRestaurants(restaurantsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
      setError('Failed to fetch administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveUser = async (id, currentStatus) => {
    try {
      setError('');
      setSuccess('');
      const nextStatus = !currentStatus;
      await api.approveUser(id, nextStatus);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, approved: nextStatus } : u));
      setSuccess(`User status updated successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update user approval.');
    }
  };

  const handleApproveRestaurant = async (id, currentStatus) => {
    try {
      setError('');
      setSuccess('');
      const nextStatus = !currentStatus;
      await api.approveRestaurant(id, nextStatus);
      setRestaurants(prev => prev.map(r => r._id === id ? { ...r, approved: nextStatus } : r));
      setSuccess(`Restaurant status updated successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update restaurant approval.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Control Center</h1>
          <p className="page-subtitle">Manage user registrations and restaurant approvals</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        {/* User Approval Section */}
        <section className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Manager Registration Requests</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Registered managers awaiting access credentials approval</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table responsive-table">
              <thead>
                <tr>
                  <th>Email / Username</th>
                  <th>Role</th>
                  <th>Restaurants Associated</th>
                  <th>Registered On</th>
                  <th>Approval Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No registered managers found in the system.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user._id}>
                      <td data-label="Email / Username" style={{ fontWeight: 600 }}>{user.username}</td>
                      <td data-label="Role" style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{user.role}</td>
                      <td data-label="Restaurants Associated">
                        {user.restaurants && user.restaurants.length > 0 ? (
                          user.restaurants.map(r => r.name).join(', ')
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td data-label="Registered On">
                        {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td data-label="Approval Status">
                        {user.approved ? (
                          <span className="badge badge-success">
                            <CheckCircle size={12} /> Approved
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={12} /> Pending Approval
                          </span>
                        )}
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <button
                          className={`btn ${user.approved ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px' }}
                          onClick={() => handleApproveUser(user._id, user.approved)}
                        >
                          {user.approved ? 'Disapprove' : 'Approve Access'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Restaurant Approval Section */}
        <section className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' }}>
              <Store size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Restaurant Listing Approvals</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Restaurants added to the platform requiring database activation</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table responsive-table">
              <thead>
                <tr>
                  <th>Restaurant Name</th>
                  <th>Created By Manager</th>
                  <th>Created On</th>
                  <th>Approval Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No restaurants registered in the system.
                    </td>
                  </tr>
                ) : (
                  restaurants.map(rest => (
                    <tr key={rest._id}>
                      <td data-label="Restaurant Name" style={{ fontWeight: 600 }}>{rest.name}</td>
                      <td data-label="Created By Manager">
                        {rest.createdBy ? (
                          typeof rest.createdBy === 'object' ? rest.createdBy.username : rest.createdBy
                        ) : (
                          <span className="badge badge-success" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>System Seeded</span>
                        )}
                      </td>
                      <td data-label="Created On">
                        {new Date(rest.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td data-label="Approval Status">
                        {rest.approved ? (
                          <span className="badge badge-success">
                            <CheckCircle size={12} /> Approved & Active
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={12} /> Pending Approval
                          </span>
                        )}
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <button
                          className={`btn ${rest.approved ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px' }}
                          onClick={() => handleApproveRestaurant(rest._id, rest.approved)}
                          disabled={rest.name === "Chuck's Kitchen"} // system default cannot be disabled
                        >
                          {rest.approved ? 'Suspend' : 'Activate & Seed Menu'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.1)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.15rem' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>Notice on Activation:</strong> Activating a restaurant for the first time automatically copies a baseline configuration of menu items to its inventory. This provides managers with complete, immediate autocomplete capabilities for creating recipes and scanning stock.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
