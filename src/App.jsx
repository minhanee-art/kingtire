import React, { useEffect, useState } from 'react';
import TireBizPro from './components/TireBizPro';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import { authService } from './services/AuthService';

function App() {
    const [isReady, setIsReady] = useState(false);
    const [view, setView] = useState('login'); // 'login', 'signup', 'main'
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            setView('main');
        }
        setIsReady(true);
    }, []);

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        setView('main');
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setView('login');
    };

    if (!isReady) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-slate-800">TireBizPro System Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {view === 'login' && (
                <Login
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToSignup={() => setView('signup')}
                />
            )}
            {view === 'signup' && (
                <Signup
                    onSwitchToLogin={() => setView('login')}
                    onSignupSuccess={() => setView('login')}
                />
            )}
            {view === 'main' && (
                <TireBizPro
                    user={user}
                    onLogout={handleLogout}
                />
            )}
        </div>
    );
}

export default App;
