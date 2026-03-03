import './DataTable.css'

function DataTable({ columns, data, onRowClick, emptyMessage = 'Belum ada data' }) {
    if (!data || data.length === 0) {
        return <div className="table-empty">{emptyMessage}</div>
    }

    return (
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={idx} onClick={() => onRowClick?.(row)} className={onRowClick ? 'clickable' : ''}>
                            {columns.map((col) => (
                                <td key={col.key}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default DataTable
