import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const STATES = [
  'Tamil Nadu',
  'Puducherry',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Other',
];

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  registered_under_gst: 'No',
  gst_no: '',
  register_address: '',
  state: 'Tamil Nadu',
  city: '',
  pincode: '',
  fssai_lic_no: '',
  pan: '',
  msme_number: '',
  type: 'Both',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    ...emptyForm,
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const load = () =>
    api
      .get('/purchases/suppliers')
      .then(setSuppliers)
      .catch(() => setSuppliers([]));

  useEffect(() => {
    load();
  }, []);

  /* =====================================================
     FILTERS
     ===================================================== */

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesSearch =
        !term ||
        String(supplier.name || '')
          .toLowerCase()
          .includes(term) ||
        String(supplier.company || '')
          .toLowerCase()
          .includes(term) ||
        String(supplier.phone || '')
          .toLowerCase()
          .includes(term) ||
        String(supplier.gst_no || '')
          .toLowerCase()
          .includes(term) ||
        String(supplier.email || '')
          .toLowerCase()
          .includes(term);

      const matchesType =
        typeFilter === 'All' ||
        (supplier.type || 'Both') === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [suppliers, search, typeFilter]);

  const supplierTypes = [
    'All',
    'Supplier',
    'Third Party',
    'Both',
  ];

  /* =====================================================
     FORM
     ===================================================== */

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
    });
    setShowForm(true);
  };

  const openEdit = (supplier) => {
    setEditing(supplier);

    setForm({
      name: supplier.name || '',
      company: supplier.company || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      registered_under_gst:
        supplier.registered_under_gst || 'No',
      gst_no: supplier.gst_no || '',
      register_address:
        supplier.register_address || '',
      state: supplier.state || 'Tamil Nadu',
      city: supplier.city || '',
      pincode: supplier.pincode || '',
      fssai_lic_no:
        supplier.fssai_lic_no || '',
      pan: supplier.pan || '',
      msme_number:
        supplier.msme_number || '',
      type: supplier.type || 'Both',
    });

    setShowForm(true);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      alert('Supplier name is required');
      return;
    }

    if (
      form.registered_under_gst === 'Yes' &&
      !form.gst_no.trim()
    ) {
      alert(
        'GST number is required when GST registration is Yes'
      );
      return;
    }

    const body = {
      ...form,
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gst_no:
        form.registered_under_gst === 'Yes'
          ? form.gst_no.trim()
          : '',
      register_address:
        form.register_address.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      fssai_lic_no:
        form.fssai_lic_no.trim(),
      pan: form.pan.trim(),
      msme_number:
        form.msme_number.trim(),
    };

    try {
      if (editing) {
        await api.put(
          `/purchases/suppliers/${editing.id}`,
          body
        );
      } else {
        await api.post(
          '/purchases/suppliers',
          body
        );
      }

      setShowForm(false);
      setEditing(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =====================================================
     STATS
     ===================================================== */

  const totalSuppliers = suppliers.length;

  const gstSuppliers = suppliers.filter(
    (supplier) =>
      supplier.registered_under_gst === 'Yes'
  ).length;

  const activeSuppliers = suppliers.filter(
    (supplier) =>
      !supplier.status ||
      supplier.status === 'Active'
  ).length;

  return (
    <div className="suppliers-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="suppliers-header">

        <div>
          <div className="suppliers-breadcrumb">
            MASTERS / SUPPLIERS
          </div>

          <h1>Suppliers</h1>

          <p>
            Manage suppliers, vendor details and
            business information
          </p>
        </div>

        <button
          className="btn suppliers-create-btn"
          onClick={openNew}
        >
          + Add Supplier
        </button>

      </div>

      {/* =================================================
          SUMMARY
          ================================================= */}

      <div className="suppliers-summary">

        <div className="supplier-stat-card">

          <div className="supplier-stat-icon">
            🏢
          </div>

          <div>
            <span>Total Suppliers</span>
            <strong>
              {totalSuppliers}
            </strong>
          </div>

        </div>

        <div className="supplier-stat-card">

          <div className="supplier-stat-icon green">
            ✓
          </div>

          <div>
            <span>Active</span>
            <strong className="supplier-green">
              {activeSuppliers}
            </strong>
          </div>

        </div>

        <div className="supplier-stat-card">

          <div className="supplier-stat-icon purple">
            GST
          </div>

          <div>
            <span>GST Registered</span>
            <strong className="supplier-purple">
              {gstSuppliers}
            </strong>
          </div>

        </div>

      </div>

      {/* =================================================
          FORM
          ================================================= */}

      {showForm && (
        <div className="supplier-form-card">

          <div className="supplier-form-header">

            <div>
              <div className="supplier-form-eyebrow">
                {editing
                  ? 'EDIT SUPPLIER'
                  : 'NEW SUPPLIER'}
              </div>

              <h2>
                {editing
                  ? 'Edit Supplier'
                  : 'Add Supplier'}
              </h2>

              <p>
                Keep supplier contact, GST and
                registration details organized.
              </p>
            </div>

            <button
              className="supplier-close-btn"
              onClick={() =>
                setShowForm(false)
              }
            >
              ×
            </button>

          </div>

          <div className="supplier-form-body">

            {/* BASIC DETAILS */}

            <div className="supplier-section">

              <div className="supplier-section-heading">
                <div className="supplier-section-icon">
                  👤
                </div>

                <div>
                  <h3>Basic Details</h3>
                  <span>
                    Supplier contact information
                  </span>
                </div>
              </div>

              <div className="supplier-form-grid four">

                <div className="supplier-field">
                  <label>
                    Supplier Name *
                  </label>

                  <input
                    placeholder="e.g. ABC Foods"
                    value={form.name}
                    onChange={(e) =>
                      updateForm(
                        'name',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>
                    Company
                  </label>

                  <input
                    placeholder="Company name"
                    value={form.company}
                    onChange={(e) =>
                      updateForm(
                        'company',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>
                    Phone
                  </label>

                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) =>
                      updateForm(
                        'phone',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) =>
                      updateForm(
                        'email',
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

            </div>

            {/* SUPPLIER TYPE + GST */}

            <div className="supplier-section">

              <div className="supplier-section-heading">
                <div className="supplier-section-icon">
                  🧾
                </div>

                <div>
                  <h3>Business & GST</h3>
                  <span>
                    Tax and supplier classification
                  </span>
                </div>
              </div>

              <div className="supplier-form-grid three">

                <div className="supplier-field">
                  <label>
                    Supplier Type
                  </label>

                  <select
                    value={form.type}
                    onChange={(e) =>
                      updateForm(
                        'type',
                        e.target.value
                      )
                    }
                  >
                    <option value="Supplier">
                      Supplier
                    </option>

                    <option value="Third Party">
                      Third Party
                    </option>

                    <option value="Both">
                      Both
                    </option>
                  </select>
                </div>

                <div className="supplier-field">
                  <label>
                    Registered Under GST
                  </label>

                  <select
                    value={
                      form.registered_under_gst
                    }
                    onChange={(e) =>
                      updateForm(
                        'registered_under_gst',
                        e.target.value
                      )
                    }
                  >
                    <option value="No">
                      No
                    </option>

                    <option value="Yes">
                      Yes
                    </option>
                  </select>
                </div>

                <div className="supplier-field">
                  <label>
                    GST Number
                  </label>

                  <input
                    placeholder="GSTIN"
                    value={form.gst_no}
                    disabled={
                      form.registered_under_gst ===
                      'No'
                    }
                    onChange={(e) =>
                      updateForm(
                        'gst_no',
                        e.target.value.toUpperCase()
                      )
                    }
                  />
                </div>

              </div>

            </div>

            {/* ADDRESS */}

            <div className="supplier-section">

              <div className="supplier-section-heading">
                <div className="supplier-section-icon">
                  📍
                </div>

                <div>
                  <h3>Registered Address</h3>
                  <span>
                    Business location details
                  </span>
                </div>
              </div>

              <div className="supplier-field full">
                <label>
                  Address
                </label>

                <textarea
                  placeholder="Enter registered address"
                  value={
                    form.register_address
                  }
                  onChange={(e) =>
                    updateForm(
                      'register_address',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="supplier-form-grid three">

                <div className="supplier-field">
                  <label>State</label>

                  <select
                    value={form.state}
                    onChange={(e) =>
                      updateForm(
                        'state',
                        e.target.value
                      )
                    }
                  >
                    {STATES.map(
                      (state) => (
                        <option
                          key={state}
                          value={state}
                        >
                          {state}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="supplier-field">
                  <label>City</label>

                  <input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) =>
                      updateForm(
                        'city',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>PIN Code</label>

                  <input
                    placeholder="PIN code"
                    value={form.pincode}
                    onChange={(e) =>
                      updateForm(
                        'pincode',
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

            </div>

            {/* OTHER DETAILS */}

            <div className="supplier-section">

              <div className="supplier-section-heading">
                <div className="supplier-section-icon">
                  📄
                </div>

                <div>
                  <h3>Registration Details</h3>
                  <span>
                    Additional business identifiers
                  </span>
                </div>
              </div>

              <div className="supplier-form-grid three">

                <div className="supplier-field">
                  <label>
                    FSSAI Licence No.
                  </label>

                  <input
                    placeholder="FSSAI number"
                    value={
                      form.fssai_lic_no
                    }
                    onChange={(e) =>
                      updateForm(
                        'fssai_lic_no',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>
                    PAN
                  </label>

                  <input
                    placeholder="PAN number"
                    value={form.pan}
                    onChange={(e) =>
                      updateForm(
                        'pan',
                        e.target.value.toUpperCase()
                      )
                    }
                  />
                </div>

                <div className="supplier-field">
                  <label>
                    MSME Number
                  </label>

                  <input
                    placeholder="MSME / UDYAM number"
                    value={
                      form.msme_number
                    }
                    onChange={(e) =>
                      updateForm(
                        'msme_number',
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

            </div>

          </div>

          {/* FORM ACTIONS */}

          <div className="supplier-form-actions">

            <button
              className="btn btn-secondary"
              onClick={() =>
                setShowForm(false)
              }
            >
              Cancel
            </button>

            <button
              className="btn"
              onClick={save}
            >
              {editing
                ? 'Save Changes'
                : 'Create Supplier'}
            </button>

          </div>

        </div>
      )}

      {/* =================================================
          TOOLBAR
          ================================================= */}

      <div className="suppliers-toolbar">

        <div className="supplier-search">

          <span>⌕</span>

          <input
            placeholder="Search supplier, company, phone or GST..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {search && (
            <button
              onClick={() =>
                setSearch('')
              }
            >
              ×
            </button>
          )}

        </div>

        <div className="supplier-filters">

          {supplierTypes.map(
            (type) => (
              <button
                key={type}
                className={
                  typeFilter === type
                    ? 'supplier-filter active'
                    : 'supplier-filter'
                }
                onClick={() =>
                  setTypeFilter(type)
                }
              >
                {type}

                <span>
                  {type === 'All'
                    ? suppliers.length
                    : suppliers.filter(
                        (supplier) =>
                          (supplier.type ||
                            'Both') ===
                          type
                      ).length}
                </span>
              </button>
            )
          )}

        </div>

      </div>

      {/* =================================================
          LIST HEADER
          ================================================= */}

      <div className="suppliers-list-header">

        <div>
          <h3>Supplier Directory</h3>

          <span>
            Showing{' '}
            {filteredSuppliers.length} of{' '}
            {suppliers.length} suppliers
          </span>
        </div>

      </div>

      {/* =================================================
          SUPPLIER LIST
          ================================================= */}

      {filteredSuppliers.length === 0 ? (
        <div className="suppliers-empty">

          <div className="suppliers-empty-icon">
            🏢
          </div>

          <strong>
            {suppliers.length === 0
              ? 'No suppliers yet'
              : 'No suppliers found'}
          </strong>

          <span>
            {suppliers.length === 0
              ? 'Add your first supplier to start managing purchases.'
              : 'Try a different search or filter.'}
          </span>

          {suppliers.length === 0 && (
            <button
              className="btn"
              onClick={openNew}
            >
              + Add Supplier
            </button>
          )}

        </div>
      ) : (
        <div className="suppliers-list">

          {filteredSuppliers.map(
            (supplier) => {

              const active =
                !supplier.status ||
                supplier.status === 'Active';

              return (
                <div
                  key={supplier.id}
                  className="supplier-card"
                >

                  {/* ICON */}

                  <div className="supplier-card-icon">
                    🏢
                  </div>

                  {/* MAIN */}

                  <div className="supplier-card-main">

                    <div className="supplier-name-row">

                      <h3>
                        {supplier.name}
                      </h3>

                      <span className="supplier-type-badge">
                        {supplier.type ||
                          'Both'}
                      </span>

                      <span
                        className={
                          active
                            ? 'supplier-status active'
                            : 'supplier-status inactive'
                        }
                      >
                        <i />
                        {active
                          ? 'Active'
                          : 'Inactive'}
                      </span>

                    </div>

                    {supplier.company && (
                      <div className="supplier-company">
                        {supplier.company}
                      </div>
                    )}

                    <div className="supplier-contact-row">

                      <span>
                        ☎ {supplier.phone ||
                          'No phone'}
                      </span>

                      <span>
                        ✉ {supplier.email ||
                          'No email'}
                      </span>

                      <span>
                        📍{' '}
                        {supplier.city ||
                          supplier.state ||
                          'No location'}
                      </span>

                    </div>

                  </div>

                  {/* GST */}

                  <div className="supplier-gst">

                    <span>
                      GST
                    </span>

                    {supplier.registered_under_gst ===
                    'Yes' ? (
                      <strong>
                        {supplier.gst_no ||
                          'Registered'}
                      </strong>
                    ) : (
                      <small>
                        Not Registered
                      </small>
                    )}

                  </div>

                  {/* ACTION */}

                  <button
                    className="supplier-edit-btn"
                    onClick={() =>
                      openEdit(supplier)
                    }
                  >
                    Edit
                  </button>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}