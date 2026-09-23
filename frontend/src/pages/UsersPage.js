import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  username: '',
  password: '',
  role: 'cashier',
};

const ROLE_INFO = {
  cashier: {
    label: 'Cashier',
    icon: '▣',
    description: 'Billing and day-to-day sales',
    discount: 'Max 10% discount',
    className: 'cashier',
  },
  manager: {
    label: 'Manager',
    icon: '◆',
    description: 'Reports, purchases and inventory',
    discount: 'Max 25% discount',
    className: 'manager',
  },
  owner: {
    label: 'Owner',
    icon: '★',
    description: 'Full system access',
    discount: 'Unlimited discount',
    className: 'owner',
  },
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const load = () => {
    api
      .get('/auth/users')
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    load();
  }, []);

  const activeUsers = users.filter(
    (user) => Number(user.is_active) === 1
  );

  const inactiveUsers = users.filter(
    (user) => Number(user.is_active) !== 1
  );

  const cashierCount = users.filter(
    (user) => user.role === 'cashier'
  ).length;

  const managerCount = users.filter(
    (user) => user.role === 'manager'
  ).length;

  const ownerCount = users.filter(
    (user) => user.role === 'owner'
  ).length;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        String(user.username || '')
          .toLowerCase()
          .includes(query) ||
        String(user.role || '')
          .toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter;

      const isActive =
        Number(user.is_active) === 1;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const save = async () => {
    const username = form.username.trim();

    if (!username || !form.password) {
      alert('Username and password are required');
      return;
    }

    setSaving(true);

    try {
      await api.post('/auth/users', {
        username,
        password: form.password,
        role: form.role,
      });

      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id, username) => {
    if (
      !window.confirm(
        `Deactivate user "${username}"?`
      )
    ) {
      return;
    }

    setDeactivatingId(id);

    try {
      await api.put(
        `/auth/users/${id}/deactivate`,
        {}
      );

      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeactivatingId(null);
    }
  };

  const formatCreatedDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="users-page">

      {/* HEADER */}
      <div className="users-header">

        <div>
          <div className="users-breadcrumb">
            ADMIN / STAFF
          </div>

          <h1>Staff & Users</h1>

          <p>
            Manage staff accounts, roles and system access
          </p>
        </div>

        <button
          className="users-add-btn"
          onClick={openCreateForm}
        >
          <span>+</span>
          Add User
        </button>

      </div>


      {/* SUMMARY CARDS */}
      <div className="users-summary-grid">

        <div className="users-summary-card">

          <div className="users-summary-icon purple">
            👥
          </div>

          <div>
            <span>Total Users</span>
            <strong>{users.length}</strong>
            <small>All staff accounts</small>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon green">
            ✓
          </div>

          <div>
            <span>Active Users</span>
            <strong>{activeUsers.length}</strong>
            <small>Currently active</small>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon blue">
            ▣
          </div>

          <div>
            <span>Cashiers</span>
            <strong>{cashierCount}</strong>
            <small>Billing access</small>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon orange">
            ◆
          </div>

          <div>
            <span>Managers</span>
            <strong>{managerCount}</strong>
            <small>Operations access</small>
          </div>

        </div>

      </div>


      {/* ROLE OVERVIEW */}
      <div className="users-role-overview">

        <div className="users-role-heading">

          <div>
            <div className="users-mini-label">
              ACCESS CONTROL
            </div>

            <h2>
              Roles & Permissions
            </h2>

            <p>
              Each role has different access to your business software.
            </p>
          </div>

          <div className="users-owner-count">
            <span>OWNER</span>
            <strong>{ownerCount}</strong>
          </div>

        </div>


        <div className="users-role-grid">

          {Object.entries(ROLE_INFO).map(
            ([role, info]) => (

              <div
                key={role}
                className={`users-role-card ${info.className}`}
              >

                <div
                  className={`users-role-icon ${info.className}`}
                >
                  {info.icon}
                </div>

                <div className="users-role-content">

                  <div className="users-role-title">
                    <strong>
                      {info.label}
                    </strong>

                    <span>
                      {users.filter(
                        (u) => u.role === role
                      ).length}
                    </span>
                  </div>

                  <p>
                    {info.description}
                  </p>

                  <small>
                    {info.discount}
                  </small>

                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* USER DIRECTORY */}
      <div className="users-directory">

        <div className="users-directory-header">

          <div>

            <div className="users-mini-label">
              USER DIRECTORY
            </div>

            <h2>
              Staff Accounts
            </h2>

            <p>
              View and manage everyone who can access the system.
            </p>

          </div>

          <div className="users-result-count">
            Showing {filteredUsers.length} of {users.length}
          </div>

        </div>


        {/* FILTERS */}
        <div className="users-filters">

          <div className="users-search">

            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search username or role..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
              >
                ×
              </button>
            )}

          </div>


          <div className="users-filter-buttons">

            <button
              className={
                roleFilter === 'all'
                  ? 'users-filter-btn active'
                  : 'users-filter-btn'
              }
              onClick={() =>
                setRoleFilter('all')
              }
            >
              All
              <span>{users.length}</span>
            </button>


            <button
              className={
                roleFilter === 'cashier'
                  ? 'users-filter-btn active'
                  : 'users-filter-btn'
              }
              onClick={() =>
                setRoleFilter('cashier')
              }
            >
              Cashier
              <span>{cashierCount}</span>
            </button>


            <button
              className={
                roleFilter === 'manager'
                  ? 'users-filter-btn active'
                  : 'users-filter-btn'
              }
              onClick={() =>
                setRoleFilter('manager')
              }
            >
              Manager
              <span>{managerCount}</span>
            </button>


            <button
              className={
                roleFilter === 'owner'
                  ? 'users-filter-btn active'
                  : 'users-filter-btn'
              }
              onClick={() =>
                setRoleFilter('owner')
              }
            >
              Owner
              <span>{ownerCount}</span>
            </button>

          </div>


          <div className="users-status-buttons">

            <button
              className={
                statusFilter === 'all'
                  ? 'users-status-btn active'
                  : 'users-status-btn'
              }
              onClick={() =>
                setStatusFilter('all')
              }
            >
              All
            </button>

            <button
              className={
                statusFilter === 'active'
                  ? 'users-status-btn active'
                  : 'users-status-btn'
              }
              onClick={() =>
                setStatusFilter('active')
              }
            >
              ● Active
            </button>

            <button
              className={
                statusFilter === 'inactive'
                  ? 'users-status-btn active'
                  : 'users-status-btn'
              }
              onClick={() =>
                setStatusFilter('inactive')
              }
            >
              ○ Inactive
            </button>

          </div>

        </div>


        {/* TABLE */}
        <div className="users-table-wrap">

          <table className="users-table">

            <thead>

              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th>ACTION</th>
              </tr>

            </thead>


            <tbody>

              {filteredUsers.map((user) => {

                const role =
                  ROLE_INFO[user.role] ||
                  ROLE_INFO.cashier;

                const isActive =
                  Number(user.is_active) === 1;

                return (
                  <tr key={user.id}>

                    <td>

                      <div className="user-identity">

                        <div
                          className={`user-avatar ${role.className}`}
                        >
                          {String(
                            user.username || '?'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <strong>
                            {user.username}
                          </strong>

                          <span>
                            User ID #{user.id}
                          </span>

                        </div>

                      </div>

                    </td>


                    <td>

                      <div
                        className={`user-role-badge ${role.className}`}
                      >
                        <span>
                          {role.icon}
                        </span>

                        {role.label}
                      </div>

                    </td>


                    <td>

                      <span
                        className={
                          isActive
                            ? 'user-status active'
                            : 'user-status inactive'
                        }
                      >

                        <i />

                        {isActive
                          ? 'Active'
                          : 'Deactivated'}

                      </span>

                    </td>


                    <td>

                      <span className="user-created">
                        {formatCreatedDate(
                          user.created_at
                        )}
                      </span>

                    </td>


                    <td>

                      {isActive ? (

                        <button
                          className="user-deactivate-btn"
                          disabled={
                            deactivatingId === user.id
                          }
                          onClick={() =>
                            deactivate(
                              user.id,
                              user.username
                            )
                          }
                        >

                          {deactivatingId === user.id
                            ? 'Deactivating...'
                            : 'Deactivate'}

                        </button>

                      ) : (

                        <span className="user-disabled-label">
                          No actions
                        </span>

                      )}

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {filteredUsers.length === 0 && (

            <div className="users-empty">

              <div className="users-empty-icon">
                👥
              </div>

              <strong>
                No users found
              </strong>

              <p>
                Try changing your search or filters.
              </p>

              <button
                className="users-empty-btn"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </button>

            </div>

          )}

        </div>

      </div>


      {/* ADD USER MODAL */}
      {showForm && (

        <div
          className="users-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !saving
            ) {
              closeCreateForm();
            }
          }}
        >

          <div className="users-modal">

            <div className="users-modal-header">

              <div>

                <div className="users-mini-label">
                  NEW ACCOUNT
                </div>

                <h2>
                  Add Staff User
                </h2>

                <p>
                  Create a login account for your staff.
                </p>

              </div>

              <button
                className="users-modal-close"
                onClick={closeCreateForm}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <div className="users-modal-body">

              {/* USERNAME */}
              <div className="users-form-group">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  placeholder="e.g. cashier01"
                  value={form.username}
                  autoFocus
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value,
                    })
                  }
                />

                <small>
                  This name will be used to log into the system.
                </small>

              </div>


              {/* PASSWORD */}
              <div className="users-form-group">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Enter a secure password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />

              </div>


              {/* ROLE */}
              <div className="users-form-group">

                <label>
                  Role
                </label>

                <div className="users-role-select-grid">

                  {Object.entries(ROLE_INFO).map(
                    ([role, info]) => (

                      <button
                        key={role}
                        type="button"
                        className={
                          form.role === role
                            ? `users-role-option selected ${info.className}`
                            : `users-role-option ${info.className}`
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            role,
                          })
                        }
                      >

                        <div
                          className={`users-role-option-icon ${info.className}`}
                        >
                          {info.icon}
                        </div>

                        <div>

                          <strong>
                            {info.label}
                          </strong>

                          <span>
                            {info.description}
                          </span>

                          <small>
                            {info.discount}
                          </small>

                        </div>

                        <div className="users-role-check">
                          {form.role === role
                            ? '✓'
                            : ''}
                        </div>

                      </button>

                    )
                  )}

                </div>

              </div>

            </div>


            <div className="users-modal-footer">

              <button
                className="users-cancel-btn"
                onClick={closeCreateForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="users-create-btn"
                onClick={save}
                disabled={saving}
              >
                {saving
                  ? 'Creating...'
                  : '+ Create User'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}