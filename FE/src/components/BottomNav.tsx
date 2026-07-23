
import { Home as HomeIcon, Users, FileText, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: <HomeIcon size={24} />, label: 'Trang chủ', path: '/' },
    { icon: <Users size={24} />, label: 'Nhóm', path: '/groups' },
    { icon: <FileText size={24} />, label: 'Hoạt động', path: '/ledger' },
    { icon: <User size={24} />, label: 'Tài khoản', path: '/profile' },
  ];

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0,
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #F3F4F6',
      display: 'flex', 
      justifyContent: 'space-around', 
      padding: '12px 0 16px 0', // Extra padding at bottom for safe area
      zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 4,
              padding: '4px 12px',
              borderRadius: 16,
              transition: 'all 0.2s ease',
              color: isActive ? '#10B981' : '#9CA3AF',
              textDecoration: 'none',
              flex: 1
            }}
          >
            <div style={{
              transition: 'transform 0.2s ease',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}>
              {item.icon}
            </div>
            <span style={{ 
              fontSize: 11, 
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em'
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;

