import React, { useEffect, useState } from 'react';
import { useAuth, useApi } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    activeSubscriptions: 0,
    totalUsage: 0,
    totalDevices: 0
  });
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsData = await apiFetch('/api/dashboard/stats');
      setStats(statsData);

      const usersData = await apiFetch('/api/users');
      setUsers(usersData);

      const devicesData = await apiFetch('/api/devices');
      setDevices(devicesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}/approve`, { method: 'PATCH' });
      await fetchData();
    } catch (err) {
      console.error('Failed to approve user:', err);
    }
  };

  const handleDeny = async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}/deny`, { method: 'PATCH' });
      await fetchData();
    } catch (err) {
      console.error('Failed to deny user:', err);
    }
  };

  const handleLock = async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}/lock`, { method: 'PATCH' });
      await fetchData();
    } catch (err) {
      console.error('Failed to lock user:', err);
    }
  };

  const handleUnlock = async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}/unlock`, { method: 'PATCH' });
      await fetchData();
    } catch (err) {
      console.error('Failed to unlock user:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter === 'all') return true;
    return u.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'locked':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#86868b]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 sidebar-glass z-10">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#0071e3] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-[#1d1d1f]">Dashboard</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'text-[#424245] hover:bg-white/60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'text-[#424245] hover:bg-white/60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'text-[#424245] hover:bg-white/60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'usage'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'text-[#424245] hover:bg-white/60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Usage</span>
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'devices'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'text-[#424245] hover:bg-white/60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Devices</span>
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-black/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3] to-[#0058b0] flex items-center justify-center text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1d1d1f] truncate">{user?.email}</p>
              <p className="text-xs text-[#86868b]">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[#86868b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-semibold text-[#1d1d1f] tracking-tight">
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'users' && 'Users'}
            {activeTab === 'subscriptions' && 'Subscriptions'}
            {activeTab === 'usage' && 'Usage'}
            {activeTab === 'devices' && 'Connected Devices'}
          </h1>
          <p className="text-[#86868b] mt-1">
            {activeTab === 'overview' && 'Your app dashboard at a glance'}
            {activeTab === 'users' && 'Manage user access and permissions'}
            {activeTab === 'subscriptions' && 'View and manage subscriptions'}
            {activeTab === 'usage' && 'Track feature usage and analytics'}
            {activeTab === 'devices' && 'See which devices are using your app'}
          </p>
        </div>

        {/* Stats Cards */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#86868b]">Total Users</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-[#1d1d1f]">{stats.totalUsers}</p>
            </div>

            <div className="stat-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#86868b]">Active Users</span>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-green-600">{stats.activeUsers}</p>
            </div>

            <div className="stat-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#86868b]">Locked Users</span>
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-red-600">{stats.lockedUsers}</p>
            </div>

            <div className="stat-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#86868b]">Subscriptions</span>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-purple-600">{stats.activeSubscriptions}</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">All Users</h2>
              <button className="apple-button text-sm">
                Add User
              </button>
            </div>

            {/* Status Filter Buttons */}
            <div className="px-6 py-3 border-b border-black/5 flex items-center space-x-2">
              <span className="text-sm text-[#86868b] mr-2">Filter:</span>
              {['all', 'pending', 'active', 'locked'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === filter
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : 'bg-black/5 text-[#424245] hover:bg-black/10'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Email</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Role</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Status</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} className="hover:bg-black/[0.02] transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td className="px-6 py-4 text-sm text-[#1d1d1f] font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getStatusBadge(u.status)}>
                          {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {u.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(u.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeny(u.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Deny
                              </button>
                            </>
                          )}
                          {u.status === 'active' && u.role !== 'admin' && (
                            <button
                              onClick={() => handleLock(u.id)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              Lock
                            </button>
                          )}
                          {u.status === 'locked' && (
                            <button
                              onClick={() => handleUnlock(u.id)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              Unlock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-[#86868b]">
                        {statusFilter === 'all' ? 'No users found' : `No ${statusFilter} users found`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">Subscriptions</h3>
            <p className="text-[#86868b] max-w-md mx-auto">
              View and manage all subscription plans, pricing, and billing history.
            </p>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">Usage Analytics</h3>
            <p className="text-[#86868b] max-w-md mx-auto">
              Track feature usage, quotas, and detailed analytics for all your apps.
            </p>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-5 border-b border-black/5">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">Connected Devices</h2>
              <p className="text-sm text-[#86868b] mt-1">Devices that have logged in to your app</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">User</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Platform</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Screen</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Timezone</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">First Seen</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-6 py-4">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {devices.map((d, i) => (
                    <tr key={d.id} className="hover:bg-black/[0.02] transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td className="px-6 py-4 text-sm text-[#1d1d1f] font-medium">{d.email}</td>
                      <td className="px-6 py-4 text-sm text-[#424245]">{d.platform || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-[#424245]">{d.screen_resolution || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-[#424245]">{d.timezone || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-[#424245]">{new Date(d.first_seen).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-[#424245]">{new Date(d.last_seen).toLocaleString()}</td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#86868b]">
                        No devices connected yet. Share your app to see devices here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
