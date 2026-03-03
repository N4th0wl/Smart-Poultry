import { useState } from 'react'
import LoadingState from './LoadingState'
import EmptyState from './EmptyState'
import './DataTable.css'

function DataTable({
    columns,
    data,
    loading = false,
    emptyMessage = 'Tidak ada data',
    emptyIcon = '📋',
    onRowClick,
    pagination = true,
    pageSize = 10
}) {
    const [currentPage, setCurrentPage] = useState(1)
    const [sortColumn, setSortColumn] = useState(null)
    const [sortDirection, setSortDirection] = useState('asc')

    if (loading) {
        return <LoadingState variant="skeleton" count={pageSize > 5 ? 5 : pageSize} />
    }

    if (!data || data.length === 0) {
        return (
            <EmptyState
                title="Data Kosong"
                message={emptyMessage}
                icon={emptyIcon}
            />
        )
    }

    // Sorting
    const sortedData = [...data].sort((a, b) => {
        if (!sortColumn) return 0
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal === bVal) return 0
        const comparison = aVal > bVal ? 1 : -1
        return sortDirection === 'asc' ? comparison : -comparison
    })

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const paginatedData = pagination
        ? sortedData.slice(startIndex, startIndex + pageSize)
        : sortedData

    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(columnKey)
            setSortDirection('asc')
        }
    }

    const handlePageChange = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="data-table-wrapper">
            <div className="data-table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                    className={col.sortable !== false ? 'sortable' : ''}
                                    style={{ width: col.width }}
                                >
                                    <span>{col.label}</span>
                                    {sortColumn === col.key && (
                                        <span className="sort-icon">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={onRowClick ? 'clickable' : ''}
                            >
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && totalPages > 1 && (
                <div className="data-table-pagination">
                    <span className="pagination-info">
                        Menampilkan {startIndex + 1}-{Math.min(startIndex + pageSize, data.length)} dari {data.length}
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            ←
                        </button>
                        <span className="pagination-current">{currentPage} / {totalPages}</span>
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DataTable
