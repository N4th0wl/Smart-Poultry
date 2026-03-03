import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state from localStorage
    useEffect(() => {
        const storedUser = authService.getUser()
        const token = authService.getToken()

        if (storedUser && token) {
            setUser(storedUser)
            setIsAuthenticated(true)
        }
        setIsLoading(false)
    }, [])

    const login = useCallback(async (email, password) => {
        const response = await authService.login(email, password)
        setUser(response.user)
        setIsAuthenticated(true)
        return response
    }, [])

    const logout = useCallback(() => {
        authService.logout()
        setUser(null)
        setIsAuthenticated(false)
    }, [])

    const updateUser = useCallback((userData) => {
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
    }, [])

    // Role checks
    const isAdmin = user?.role === 'admin'
    const isUser = user?.role === 'user' || (!user?.role && isAuthenticated)

    // Role-based permission checks
    const hasPermission = useCallback((permission) => {
        if (!user) return false
        if (user.role === 'admin') return true
        return true
    }, [user])

    const value = {
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        isUser,
        login,
        logout,
        updateUser,
        hasPermission,
        kodePeternakan: user?.kodePeternakan,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
