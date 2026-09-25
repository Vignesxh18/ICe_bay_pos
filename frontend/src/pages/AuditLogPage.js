import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/auth/audit-log').then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <div className="card">
      <h4 style={{ marginTop: 0 }}>Audit Log</h4>
      <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -6 }}>
        Every bill cancellation, refund, and discount override, with who did it, when, and why.
      </p>
      <table>
        <thead><tr><th>Time</th><th>Action</th><th>Reference</th><th>Amount</th><th>By</th><th>Reason</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td>{l.created_at}</td>
              <td>{l.action}</td>
              <td>{l.reference || '-'}</td>
              <td>{l.amount != null ? `₹${l.amount.toFixed(2)}` : '-'}</td>
              <td>{l.username || '-'}</td>
              <td>{l.reason || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p>No audit events recorded yet.</p>}
    </div>
  );
}
