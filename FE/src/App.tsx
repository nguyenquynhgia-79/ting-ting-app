import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import { DialogProvider } from './contexts/DialogContext';

// Lazy loaded pages to optimize bundle size (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Groups = lazy(() => import('./pages/Groups'));
const CreateGroup = lazy(() => import('./pages/CreateGroup'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
const SettleUp = lazy(() => import('./pages/SettleUp'));
const Profile = lazy(() => import('./pages/Profile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const EditExpense = lazy(() => import('./pages/EditExpense'));
const TripDetail = lazy(() => import('./pages/TripDetail').then(m => ({ default: m.TripDetail })));
const TripPlanner = lazy(() => import('./pages/TripPlanner').then(m => ({ default: m.TripPlanner })));

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const FallbackLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
    <div style={{ width: 40, height: 40, border: '4px solid #f3f4f6', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Đang tải...</div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DialogProvider>
          <div className="container">
            <Router>
              <Suspense fallback={<FallbackLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                  <Route path="/add-expense" element={<PrivateRoute><AddExpense /></PrivateRoute>} />
                  <Route path="/ledger" element={<PrivateRoute><Ledger /></PrivateRoute>} />
                  <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
                  <Route path="/groups/:id" element={<PrivateRoute><GroupDetails /></PrivateRoute>} />
                  <Route path="/groups/:id/trips/new" element={<PrivateRoute><TripPlanner /></PrivateRoute>} />
                  <Route path="/groups/:id/trips/:tripId" element={<PrivateRoute><TripDetail /></PrivateRoute>} />
                  <Route path="/groups/:id/settle" element={<PrivateRoute><SettleUp /></PrivateRoute>} />
                  <Route path="/groups/new" element={<PrivateRoute><CreateGroup /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
                  <Route path="/groups/join" element={<PrivateRoute><JoinGroup /></PrivateRoute>} />
                  <Route path="/expenses/:id/edit" element={<PrivateRoute><EditExpense /></PrivateRoute>} />
                </Routes>
              </Suspense>
            </Router>
          </div>
        </DialogProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
