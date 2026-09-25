import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloading, setDownloading] = useState('');

  const loadSettings = () => {
    api
      .get('/settings')
      .then(setSettings)
      .catch(() => setSettings(null));
  };

  const loadBackups = () => {
    api
      .get('/backup/list')
      .then(setBackups)
      .catch(() => setBackups([]));
  };

  useEffect(() => {
    loadSettings();
    loadBackups();
  }, []);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const save = async () => {
    setSaving(true);

    try {
      await api.put('/settings', settings);
      alert('Settings saved successfully');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    if (
      !window.confirm(
        'Create a backup of the current database now?'
      )
    ) {
      return;
    }

    setCreatingBackup(true);

    try {
      const res = await api.post('/backup/create', {});

      alert(`Backup created: ${res.filename}`);

      loadBackups();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const downloadBackup = (filename) => {
    try {
      setDownloading(filename);

      const token = localStorage.getItem(
        'icecream_token'
      );

      window.open(
        `/api/backup/download/${filename}?token=${token}`,
        '_blank'
      );
    } finally {
      setTimeout(() => {
        setDownloading('');
      }, 800);
    }
  };

  const formatDate = (value) => {
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

  const formatSize = (size) => {
    const number = Number(size || 0);

    if (number >= 1024) {
      return `${(number / 1024).toFixed(2)} MB`;
    }

    return `${number.toFixed(2)} KB`;
  };

  if (!settings) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="settings-loading-icon">
            ⚙
          </div>

          <strong>Loading Settings</strong>

          <span>
            Please wait while your shop settings are loaded.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">

      {/* PAGE HEADER */}
      <div className="settings-header">

        <div>
          <div className="settings-breadcrumb">
            ADMIN / SETTINGS
          </div>

          <h1>Settings</h1>

          <p>
            Manage your shop information, receipts and database backups
          </p>
        </div>

        <button
          className="settings-save-top"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : '✓ Save Changes'}
        </button>

      </div>


      {/* QUICK STATUS */}
      <div className="settings-summary-grid">

        <div className="settings-summary-card">

          <div className="settings-summary-icon purple">
            🏪
          </div>

          <div>
            <span>SHOP</span>
            <strong>
              {settings.shop_name || 'Not configured'}
            </strong>
            <small>Business information</small>
          </div>

        </div>


        <div className="settings-summary-card">

          <div className="settings-summary-icon green">
            ✓
          </div>

          <div>
            <span>RECEIPT</span>
            <strong>Configured</strong>
            <small>Thermal receipt details</small>
          </div>

        </div>


        <div className="settings-summary-card">

          <div className="settings-summary-icon blue">
            GST
          </div>

          <div>
            <span>TAX DETAILS</span>
            <strong>
              {settings.shop_gst
                ? 'Registered'
                : 'Not Added'}
            </strong>
            <small>GST number</small>
          </div>

        </div>


        <div className="settings-summary-card">

          <div className="settings-summary-icon orange">
            💾
          </div>

          <div>
            <span>BACKUPS</span>
            <strong>{backups.length}</strong>
            <small>Saved database backups</small>
          </div>

        </div>

      </div>


      {/* SHOP DETAILS */}
      <div className="settings-card">

        <div className="settings-card-header">

          <div className="settings-card-icon purple">
            🏪
          </div>

          <div>
            <div className="settings-section-label">
              BUSINESS INFORMATION
            </div>

            <h2>Shop Details</h2>

            <p>
              These details can be used on your bills and receipts.
            </p>
          </div>

        </div>


        <div className="settings-form">

          <div className="settings-form-row">

            <div className="settings-field">

              <label>Shop Name</label>

              <input
                type="text"
                value={settings.shop_name || ''}
                placeholder="e.g. Ice Bay"
                onChange={(e) =>
                  updateSetting(
                    'shop_name',
                    e.target.value
                  )
                }
              />

            </div>


            <div className="settings-field">

              <label>Phone</label>

              <input
                type="text"
                value={settings.shop_phone || ''}
                placeholder="e.g. +91 XXXXX XXXXX"
                onChange={(e) =>
                  updateSetting(
                    'shop_phone',
                    e.target.value
                  )
                }
              />

            </div>

          </div>


          <div className="settings-form-row">

            <div className="settings-field">

              <label>
                GST Number
                <span>OPTIONAL</span>
              </label>

              <input
                type="text"
                value={settings.shop_gst || ''}
                placeholder="Enter GST number"
                onChange={(e) =>
                  updateSetting(
                    'shop_gst',
                    e.target.value
                  )
                }
              />

            </div>


            <div className="settings-field">

              <label>Address</label>

              <input
                type="text"
                value={settings.shop_address || ''}
                placeholder="Shop address"
                onChange={(e) =>
                  updateSetting(
                    'shop_address',
                    e.target.value
                  )
                }
              />

            </div>

          </div>


          <div className="settings-field">

            <label>Receipt Footer Message</label>

            <textarea
              rows="3"
              value={settings.receipt_footer || ''}
              placeholder="e.g. Thank you for visiting Ice Bay!"
              onChange={(e) =>
                updateSetting(
                  'receipt_footer',
                  e.target.value
                )
              }
            />

            <small>
              This message can appear at the bottom of your thermal receipt.
            </small>

          </div>


          <div className="settings-save-row">

            <div>
              <strong>
                Save your business details
              </strong>

              <span>
                Changes will be stored in your shop settings.
              </span>
            </div>

            <button
              className="settings-primary-btn"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Settings'}
            </button>

          </div>

        </div>

      </div>


      {/* BACKUP */}
      <div className="settings-card backup-card">

        <div className="settings-card-header">

          <div className="settings-card-icon orange">
            💾
          </div>

          <div>
            <div className="settings-section-label">
              DATA PROTECTION
            </div>

            <h2>Backup & Restore</h2>

            <p>
              Keep a safe copy of your database in case your computer or database is lost.
            </p>
          </div>

          <button
            className="settings-backup-btn"
            onClick={createBackup}
            disabled={creatingBackup}
          >
            {creatingBackup
              ? 'Creating...'
              : '+ Create Backup'}
          </button>

        </div>


        <div className="settings-backup-notice">

          <div className="settings-backup-notice-icon">
            !
          </div>

          <div>

            <strong>
              Protect your business data
            </strong>

            <p>
              A backup contains a copy of your database at that moment.
              Download important backups and keep them somewhere safe.
            </p>

          </div>

        </div>


        <div className="settings-backup-stats">

          <div>
            <span>Total Backups</span>
            <strong>{backups.length}</strong>
          </div>

          <div>
            <span>Latest Backup</span>

            <strong>
              {backups.length > 0
                ? formatDate(
                    backups[0].created_at
                  )
                : 'No backups yet'}
            </strong>
          </div>

        </div>


        <div className="settings-backup-table-wrap">

          <table className="settings-backup-table">

            <thead>

              <tr>
                <th>BACKUP FILE</th>
                <th>SIZE</th>
                <th>CREATED</th>
                <th>ACTION</th>
              </tr>

            </thead>

            <tbody>

              {backups.map((backup) => (

                <tr key={backup.filename}>

                  <td>

                    <div className="settings-file">

                      <div className="settings-file-icon">
                        DB
                      </div>

                      <div>
                        <strong>
                          {backup.filename}
                        </strong>

                        <span>
                          Database backup
                        </span>
                      </div>

                    </div>

                  </td>


                  <td>
                    <span className="settings-size">
                      {formatSize(
                        backup.size_kb
                      )}
                    </span>
                  </td>


                  <td>
                    <span className="settings-date">
                      {formatDate(
                        backup.created_at
                      )}
                    </span>
                  </td>


                  <td>

                    <button
                      className="settings-download-btn"
                      onClick={() =>
                        downloadBackup(
                          backup.filename
                        )
                      }
                      disabled={
                        downloading ===
                        backup.filename
                      }
                    >
                      {downloading ===
                      backup.filename
                        ? 'Opening...'
                        : '↓ Download'}
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>


          {backups.length === 0 && (

            <div className="settings-empty-backups">

              <div className="settings-empty-icon">
                💾
              </div>

              <strong>
                No backups yet
              </strong>

              <p>
                Create your first database backup using the button above.
              </p>

              <button
                className="settings-empty-btn"
                onClick={createBackup}
                disabled={creatingBackup}
              >
                {creatingBackup
                  ? 'Creating...'
                  : 'Create First Backup'}
              </button>

            </div>

          )}

        </div>

      </div>


      {/* SAVE BAR */}
      <div className="settings-bottom-bar">

        <div>

          <div className="settings-bottom-icon">
            ✓
          </div>

          <div>
            <strong>
              Settings are ready
            </strong>

            <span>
              Remember to save after changing shop details.
            </span>
          </div>

        </div>

        <button
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </div>

    </div>
  );
}