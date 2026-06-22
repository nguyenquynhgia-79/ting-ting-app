import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import Ledger from './pages/Ledger';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import GroupDetails from './pages/GroupDetails';
import SettleUp from './pages/SettleUp';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import JoinGroup from './pages/JoinGroup';
import EditExpense from './pages/EditExpense';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="container">
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/add-expense" 
              element={
                <PrivateRoute>
                  <AddExpense />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/ledger" 
              element={
                <PrivateRoute>
                  <Ledger />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/groups" 
              element={
                <PrivateRoute>
                  <Groups />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/groups/:id" 
              element={
                <PrivateRoute>
                  <GroupDetails />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/groups/:id/settle" 
              element={
                <PrivateRoute>
                  <SettleUp />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/groups/new" 
              element={
                <PrivateRoute>
                  <CreateGroup />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/change-password" 
              element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/groups/join" 
              element={
                <PrivateRoute>
                  <JoinGroup />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/expenses/:id/edit" 
              element={
                <PrivateRoute>
                  <EditExpense />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Router>
      </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
