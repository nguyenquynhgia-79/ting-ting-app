import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type DialogType = 'alert' | 'confirm';

interface DialogOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface DialogContextValue {
  alert: (options: DialogOptions | string) => Promise<void>;
  confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

interface DialogState extends DialogOptions {
  isOpen: boolean;
  dialogType: DialogType;
  resolve?: (value: any) => void;
}

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    dialogType: 'alert',
    message: '',
  });

  const alert = (options: DialogOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        dialogType: 'alert',
        title: opts.title || 'Thông báo',
        message: opts.message,
        confirmText: opts.confirmText || 'Đóng',
        type: opts.type || 'info',
        resolve,
      });
    });
  };

  const confirm = (options: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        dialogType: 'confirm',
        title: opts.title || 'Xác nhận',
        message: opts.message,
        confirmText: opts.confirmText || 'Xác nhận',
        cancelText: opts.cancelText || 'Hủy bỏ',
        type: opts.type || 'warning',
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      dialogState.resolve(dialogState.dialogType === 'confirm' ? true : undefined);
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
  };

  const getIcon = () => {
    switch (dialogState.type) {
      case 'warning': return <AlertCircle size={32} color="#F59E0B" />;
      case 'error': return <AlertCircle size={32} color="#EF4444" />;
      case 'success': return <CheckCircle size={32} color="#10B981" />;
      default: return <Info size={32} color="#3B82F6" />;
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      {dialogState.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={dialogState.dialogType === 'alert' ? handleConfirm : handleCancel}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>
              {`
                @keyframes popIn {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
              `}
            </style>
            
            <div style={{ marginBottom: 16 }}>
              {getIcon()}
            </div>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {dialogState.title}
            </h3>
            
            <div style={{ margin: '0 0 24px 0', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              {dialogState.dialogType === 'confirm' && (
                <button
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  {dialogState.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: dialogState.type === 'error' ? '#EF4444' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
