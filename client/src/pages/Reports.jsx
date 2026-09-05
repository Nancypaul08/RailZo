export default function Reports() {
  const token = localStorage.getItem('tl_token');

  const download = async (path, filename) => {
    const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  return (
    <div>
      <h2 className="vtitle">Reports</h2>
      <p className="vsub">Export current data or print a report. CSV exports open cleanly in Excel or Sheets.</p>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">Export data</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn secondary" onClick={() => download('/reports/incidents.csv', 'incidents.csv')}>Export incidents (CSV)</button>
            <button className="btn secondary" onClick={() => download('/reports/missing.csv', 'missing_persons.csv')}>Export missing persons (CSV)</button>
            <button className="btn secondary" onClick={() => download('/reports/duties.csv', 'duty_roster.csv')}>Export duty roster (CSV)</button>
            <button className="btn secondary" onClick={() => download('/reports/logs.csv', 'activity_register.csv')}>Export activity register (CSV)</button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">Print-friendly report</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>Opens your browser's print dialog for this page — choose "Save as PDF" there for a PDF copy.</p>
          <button className="btn primary" onClick={printReport}>Print current page</button>
        </div>
      </div>
    </div>
  );
}
