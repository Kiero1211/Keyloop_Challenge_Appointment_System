

interface DataTableProps {
  data: any[];
  error?: Error | null;
  loading: boolean;
}

export function DataTable({ data, error, loading }: DataTableProps) {
  if (loading) {
    return <p>Loading data...</p>;
  }

  if (error) {
    if ((error as any).cause === 403) {
      return <div style={{ color: 'red', padding: '20px', border: '1px solid red', background: '#ffe6e6' }}>You don't have permission to see this</div>;
    }
    return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  }

  if (!data || data.length === 0) {
    return <p>No records found.</p>;
  }

  // extract columns from the first object
  const columns = Object.keys(data[0]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            {columns.map(col => (
              <th key={col} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td key={col} style={{ border: '1px solid #ccc', padding: '8px' }}>
                  {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
