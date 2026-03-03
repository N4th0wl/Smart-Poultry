import { useState, useEffect } from 'react'
import { dashboardService, todoService } from '../services'
import { KPICard, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'

function DashboardHome() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [kandangStats, setKandangStats] = useState([])

  // ToDo State
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [todoLoading, setTodoLoading] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [summaryData, kandangData, todoData] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getKandangStats(),
          todoService.getAll()
        ])

        setSummary(summaryData.data)
        setKandangStats(kandangData.data || [])
        setTodos(todoData.data || [])
      } catch (err) {
        console.error('Dashboard error:', err)
        setError('Gagal memuat data dashboard')
        toast.error('Gagal memuat data dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const handleAddTodo = async (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    try {
      setTodoLoading(true)
      const res = await todoService.create({
        judul: newTodo,
        prioritas: 'Medium'
      })
      setTodos([...todos, res.data])
      setNewTodo('')
      toast.success('Todo ditambahkan')
    } catch (err) {
      toast.error('Gagal tambah todo')
    } finally {
      setTodoLoading(false)
    }
  }

  const handleToggleTodo = async (id, currentStatus) => {
    try {
      const updatedStatus = !currentStatus
      // Optimistic update
      const updatedTodos = todos.map(t =>
        t.IdToDo === id ? { ...t, IsCompleted: updatedStatus } : t
      )
      setTodos(updatedTodos)

      await todoService.update(id, { isCompleted: updatedStatus })
    } catch (err) {
      toast.error('Gagal update todo')
      // Revert if failed (fetch again)
      const res = await todoService.getAll()
      setTodos(res.data)
    }
  }

  const handleDeleteTodo = async (id) => {
    try {
      setTodos(todos.filter(t => t.IdToDo !== id))
      await todoService.delete(id)
      toast.success('Todo dihapus')
    } catch (err) {
      toast.error('Gagal hapus todo')
      const res = await todoService.getAll()
      setTodos(res.data)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-grid">
        <LoadingState variant="spinner" text="Memuat dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <EmptyState
          title="Terjadi Kesalahan"
          message={error}
          actionLabel="Coba Lagi"
          onAction={() => window.location.reload()}
        />
      </div>
    )
  }

  const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num || 0)

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="dashboard-grid">
      {/* Hero Section */}
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h2>Dashboard Peternakan</h2>
          <p className="muted">
            {summary?.totalKandang > 0
              ? `${summary.totalKandang} Kandang Aktif`
              : 'Belum ada kandang aktif'}
            {summary?.nextHarvestDate && ` • Estimasi Panen: ${formatDate(summary.nextHarvestDate)}`}
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-item">
            <span className="metric-label">TOTAL POPULASI</span>
            <strong className="metric-value">{formatNumber(summary?.totalPopulasi)}</strong>
          </div>
          <div className="metric-item">
            <span className="metric-label">ORDER PENDING</span>
            <strong className="metric-value">{summary?.pendingOrders || 0}</strong>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="card-grid">
        <KPICard
          title="POPULASI AYAM"
          value={formatNumber(summary?.totalPopulasi)}
          subtitle="Total populasi aktif"
          icon="" // Removed Emoji
        />
        <KPICard
          title="SUHU RATA-RATA"
          value={`${summary?.avgSuhu || 0}°C`}
          subtitle="Kondisi kandang saat ini"
          icon="" // Removed Emoji
          variant={summary?.avgSuhu > 32 || summary?.avgSuhu < 26 ? 'warning' : 'default'}
        />
        <KPICard
          title="ORDER PENDING"
          value={summary?.pendingOrders || 0}
          subtitle="Pesanan perlu diproses"
          icon="" // Removed Emoji
          variant={summary?.pendingOrders > 0 ? 'highlight' : 'default'}
        />
        <KPICard
          title="FEED INTAKE"
          value={`${summary?.feedIntakeChange > 0 ? '+' : ''}${summary?.feedIntakeChange || 0}%`}
          subtitle="Perubahan 7 hari terakhir"
          icon="" // Removed Emoji
          trend={summary?.feedIntakeChange > 0 ? 'NAIK' : 'TURUN'}
          trendType={summary?.feedIntakeChange > 0 ? 'up' : 'down'}
        />
      </section>

      <div className="dashboard-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>

        {/* Left: Kandang Stats */}
        <section>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>STATUS KANDANG</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {kandangStats.map((kandang) => (
              <div key={kandang.KodeKandang} className="stat-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{kandang.KodeKandang}</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '0.25rem' }}>{formatNumber(kandang.populasi)} Ekor</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Suhu {kandang.suhu || '-'}°C • Umur {kandang.umurAyam || 0} Hari
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: kandang.status === 'Stabil' ? 'var(--bg-success-subtle)' : 'var(--bg-warning-subtle)',
                  color: kandang.status === 'Stabil' ? 'var(--text-success)' : 'var(--text-warning)'
                }}>
                  {kandang.status.toUpperCase()}
                </div>
              </div>
            ))}
            {kandangStats.length === 0 && <p className="muted">Belum ada data kandang.</p>}
          </div>
        </section>

        {/* Right: To-Do List */}
        <section className="panel-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>TO-DO LIST</h3>

          <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Tambah tugas..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
              disabled={todoLoading}
            />
            <button
              type="submit"
              disabled={todoLoading || !newTodo.trim()}
              style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
            >
              +
            </button>
          </form>

          <ul className="todo-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todos.map(todo => (
              <li key={todo.IdToDo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={todo.IsCompleted}
                  onChange={() => handleToggleTodo(todo.IdToDo, todo.IsCompleted)}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                />
                <span style={{ flex: 1, fontSize: '0.9rem', textDecoration: todo.IsCompleted ? 'line-through' : 'none', color: todo.IsCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {todo.Judul}
                </span>
                <button
                  onClick={() => handleDeleteTodo(todo.IdToDo)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                  title="Hapus"
                >
                  &times;
                </button>
              </li>
            ))}
            {todos.length === 0 && <p className="muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>Tidak ada tugas.</p>}
          </ul>
        </section>

      </div>
    </div>
  )
}

export default DashboardHome
