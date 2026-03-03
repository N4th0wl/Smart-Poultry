import { createContext, useContext, useState, useCallback } from 'react'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
    const [filters, setFiltersState] = useState({
        cycle: '',
        kandang: '',
    })

    const setFilters = useCallback((newFilters) => {
        setFiltersState((prev) => ({
            ...prev,
            ...newFilters,
        }))
    }, [])

    const resetFilters = useCallback(() => {
        setFiltersState({
            cycle: '',
            kandang: '',
        })
    }, [])

    const value = {
        filters,
        setFilters,
        resetFilters,
        selectedCycle: filters.cycle,
        selectedKandang: filters.kandang,
    }

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    )
}

export function useFilters() {
    const context = useContext(FilterContext)
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider')
    }
    return context
}

export default FilterContext
