import { useState, useEffect } from 'react';
import { X, Check, Camera, Users, Search, Plus, UserPlus, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { uploadFile } from '../services/upload.service';
import { useDialog } from '../contexts/DialogContext';

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const navigate = useNavigate();
  const dialog = useDialog();

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedSearch) {
      handleSearch(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?q=${query}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (user: any) => {
    if (members.find(m => m.id === user.id)) {
      setMembers(members.filter(m => m.id !== user.id));
    } else {
      setMembers([...members, user]);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/groups', {
        name,
        member_ids: members.map(m => m.id)
      });
      const groupId = response.data.id;
      // Upload cover if selected
      if (coverFile) {
        try {
          const coverUrl = await uploadFile({ type: 'group_cover', file: coverFile, groupId });
          await api.patch(`/groups/${groupId}/cover`, { coverUrl });
        } catch (uploadErr) {
          console.error('Cover upload failed (non-fatal)', uploadErr);
          dialog.alert({ message: 'Tạo nhóm thành công nhưng lỗi upload ảnh đại diện!', type: 'error' });
        }
      }
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      console.error("Error creating group", err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)',
        opacity: 0.3,
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(16, 185, 129, 0.08)'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            width: 40, height: 40, borderRadius: '12px',
            background: 'var(--surface)', border: '1px solid var(--border)', 
            color: 'var(--text-primary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ 
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--primary)',
          letterSpacing: '-0.3px',
          whiteSpace: 'nowrap'
        }}>
          Tạo nhóm mới
        </h2>
        <div style={{ width: 40 }}></div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', paddingBottom: 120, position: 'relative', zIndex: 1 }}>
        {/* Avatar Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
            <div style={{ 
              width: 90, height: 90, borderRadius: 32, 
              backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: 'var(--primary)', border: '1px solid var(--primary-light)', 
              boxShadow: '0 12px 25px rgba(16, 185, 129, 0.12)',
              overflow: 'hidden'
            }}>
              {coverPreview
                ? <img src={coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Users size={40} strokeWidth={1.5} />
              }
            </div>
            {/* Hidden file input */}
            <input type="file" id="cover-upload" hidden accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
            <label
              htmlFor="cover-upload"
              style={{ 
                position: 'absolute', bottom: -4, right: -4, 
                width: 32, height: 32, borderRadius: '50%', 
                backgroundColor: 'var(--primary)', border: '3px solid var(--surface)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
            >
              <Camera size={14} />
            </label>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Ảnh đại diện nhóm</p>
        </div>

        {/* Form Section */}
        <div style={{ 
          backgroundColor: 'var(--surface)', borderRadius: 28, 
          border: '1px solid var(--border)', padding: '12px 20px', 
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
        }}>
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tên nhóm</label>
            <input 
              type="text" 
              placeholder="Ví dụ: Chuyến đi Đà Lạt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', fontSize: 17, fontWeight: 700, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', padding: '4px 0' }}
              autoFocus
            />
          </div>

          <div style={{ padding: '16px 0' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Mô tả (Tùy chọn)</label>
            <input 
              type="text" 
              placeholder="Mục đích của nhóm này là gì?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', fontSize: 15, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontWeight: 500, padding: '4px 0' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: 16, 
            color: 'var(--negative)', 
            fontSize: 14, 
            fontWeight: 500,
            marginTop: -8
          }}>
            {error}
          </div>
        )}

        {/* Member Selection Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Thêm thành viên</h3>
            <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 100 }}>
              {members.length + 1} người
            </div>
          </div>

          {/* Selected Members Scroll */}
          {members.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', padding: '4px 0 12px', scrollbarWidth: 'none' }}>
              {members.map(member => (
                <div key={member.id} style={{ 
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, 
                  padding: '6px 12px', backgroundColor: 'var(--surface)', border: '1px solid var(--primary-light)', borderRadius: 100,
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.05)'
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 800 }}>
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{member.username}</span>
                  <button onClick={() => toggleMember(member)} style={{ background: 'none', border: 'none', color: 'var(--negative)', display: 'flex', alignItems: 'center', padding: 0, cursor: 'pointer' }}>
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: 20, 
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <Search size={20} style={{ color: 'var(--text-muted)', marginRight: 12 }} />
              <input 
                type="text" 
                placeholder="Tìm bạn bè qua tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '12px 0', fontSize: 15, outline: 'none', fontWeight: 500, color: 'var(--text-primary)' }}
              />
              {isSearching && (
                <Loader2 size={18} style={{ color: 'var(--primary)' }} className="animate-spin" />
              )}
            </div>
          </div>

          {/* Search Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.length > 0 ? (
              searchResults.map(user => {
                const isSelected = members.find(m => m.id === user.id);
                return (
                  <div 
                    key={user.id} 
                    onClick={() => toggleMember(user)}
                    style={{ 
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      backgroundColor: 'var(--surface)',
                      border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                      borderRadius: 20, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 16, 
                      backgroundColor: isSelected ? 'var(--primary-light)' : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 800,
                      fontSize: 16
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: 'var(--text-primary)' }}>{user.username}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{user.email}</p>
                    </div>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                      border: isSelected ? 'none' : '2px solid var(--border)',
                      color: 'white',
                      transition: 'all 0.2s'
                    }}>
                      {isSelected ? <Check size={14} strokeWidth={3} /> : <Plus size={14} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </div>
                );
              })
            ) : searchQuery && !isSearching ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                Không tìm thấy kết quả nào cho "{searchQuery}"
              </div>
            ) : !searchQuery && (
              <div style={{ 
                textAlign: 'center', padding: '48px 24px', 
                backgroundColor: 'rgba(255, 255, 255, 0.5)', 
                borderRadius: 28, border: '2px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <div style={{ 
                  width: 56, height: 56, borderRadius: 20, backgroundColor: 'var(--surface)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  color: 'var(--text-muted)', boxShadow: '0 8px 16px rgba(0,0,0,0.03)'
                }}>
                  <UserPlus size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: 0 }}>Chưa có thành viên nào</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>Hãy tìm kiếm và thêm bạn bè của bạn</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)',
        padding: '20px',
        zIndex: 100
      }}>
        <button 
          onClick={handleCreate} 
          disabled={!name || loading}
          style={{ 
            width: '100%', 
            backgroundColor: !name || loading ? '#E5E7EB' : 'var(--primary)', 
            color: !name || loading ? '#9CA3AF' : 'white', 
            padding: '18px', 
            borderRadius: 20, 
            fontSize: 16,
            fontWeight: 800, 
            border: 'none',
            cursor: !name || loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: !name || loading ? 'none' : '0 10px 25px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <Check size={20} strokeWidth={3} />
              Tạo nhóm ngay
            </>
          )}
        </button>
      </div>
    </div>

  );
};

export default CreateGroup;

