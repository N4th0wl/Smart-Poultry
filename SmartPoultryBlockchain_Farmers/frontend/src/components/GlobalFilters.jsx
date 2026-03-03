import { useState, useEffect } from 'react'
import { kandangService, cycleService } from '../services'
import './GlobalFilters.css'

function GlobalFilters({
    onFilterChange,
    showCycleFilter = true,
    showKandangFilter = true
}) {
    const [cycles, setCycles] = useState([])
    const [kandangs, setKandangs] = useState([])
    const [loading, setLoading] = useState(true)

    const [selectedCycle, setSelectedCycle] = useState('')
    const [selectedKandang, setSelectedKandang] = useState('')

    useEffect(() => {
        const loadFilterData = async () => {
            try {
                setLoading(true)
                const [cyclesData, kandangsData] = await Promise.all([
                    showCycleFilter ? cycleService.getCycles() : Promise.resolve([]),
                    showKandangFilter ? kandangService.getKandangs() : Promise.resolve([])
                ])
                setCycles(cyclesData)
                setKandangs(kandangsData)
            } catch (error) {
                console.error('Failed to load filter data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadFilterData()
    }, [showCycleFilter, showKandangFilter])

    const handleCycleChange = (e) => {
        const value = e.target.value
        setSelectedCycle(value)
        setSelectedKandang('') // Reset kandang when cycle changes
        onFilterChange?.({ cycle: value, kandang: '' })
    }

    const handleKandangChange = (e) => {
        const value = e.target.value
        setSelectedKandang(value)
        onFilterChange?.({ cycle: selectedCycle, kandang: value })
    }

    const handleReset = () => {
        setSelectedCycle('')
        setSelectedKandang('')
        onFilterChange?.({ cycle: '', kandang: '' })
    }

    // Filter kandangs by selected cycle if applicable
    const filteredKandangs = selectedCycle
        ? kandangs.filter(k => k.KodeCycle == selectedCycle)
        : kandangs

    return (
        <div className="global-filters">
            {showCycleFilter && (
                <div className="filter-group">
                    <label htmlFor="cycle-filter">Cycle</label>
                    <select
                        id="cycle-filter"
                        value={selectedCycle}
                        onChange={handleCycleChange}
                        disabled={loading}
                        className="filter-select"
                    >
                        <option value="">Semua Cycle</option>
                        {cycles.map((cycle) => (
                            <option key={cycle.KodeCycle} value={cycle.KodeCycle}>
                                Cycle {cycle.KodeCycle} - {new Date(cycle.TanggalMulai).toLocaleDateString('id-ID')}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {showKandangFilter && (
                <div className="filter-group">
                    <label htmlFor="kandang-filter">Kandang</label>
                    <select
                        id="kandang-filter"
                        value={selectedKandang}
                        onChange={handleKandangChange}
                        disabled={loading}
                        className="filter-select"
                    >
                        <option value="">Semua Kandang</option>
                        {filteredKandangs.map((kandang) => (
                            <option key={kandang.KodeKandang} value={kandang.KodeKandang}>
                                {kandang.KodeKandang}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {(selectedCycle || selectedKandang) && (
                <button
                    type="button"
                    className="filter-reset"
                    onClick={handleReset}
                >
                    Reset Filter
                </button>
            )}
        </div>
    )
}

export default GlobalFilters
