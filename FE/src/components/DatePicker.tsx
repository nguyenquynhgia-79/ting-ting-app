import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;          // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  minDate?: string;       // YYYY-MM-DD
}

const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(val: string): string {
  const d = parseDate(val);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=CN
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  minDate,
}) => {
  const today = new Date();
  const selected = parseDate(value);
  const minD = parseDate(minDate || '');

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toYMD(d));
    setOpen(false);
  };

  const handleOpen = () => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    setOpen(o => !o);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth); // 0=CN
  const blanks = firstDay; // CN=0 → 0 blanks if week starts Sun, matches VI_DAYS order

  const todayYMD = toYMD(today);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="tp-datepicker-trigger"
      >
        <span className={value ? 'tp-datepicker-value' : 'tp-datepicker-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={18} className="tp-datepicker-icon" />
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div className="tp-calendar-popup">
          {/* Header */}
          <div className="tp-cal-header">
            <button type="button" className="tp-cal-nav" onClick={prevMonth}>
              <ChevronLeft size={18} />
            </button>
            <span className="tp-cal-title">
              {VI_MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="tp-cal-nav" onClick={nextMonth}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day labels */}
          <div className="tp-cal-grid">
            {VI_DAYS.map(d => (
              <div key={d} className="tp-cal-day-label">{d}</div>
            ))}

            {/* Blanks */}
            {Array.from({ length: blanks }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ymd = toYMD(new Date(viewYear, viewMonth, day));
              const isSelected = value === ymd;
              const isToday = ymd === todayYMD;
              const isDisabled = minD ? new Date(ymd) < minD : false;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelect(day)}
                  className={`tp-cal-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}${isDisabled ? ' disabled' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="tp-cal-footer">
            <button type="button" className="tp-cal-clear" onClick={() => { onChange(''); setOpen(false); }}>
              Xóa
            </button>
            <button type="button" className="tp-cal-today" onClick={() => { onChange(todayYMD); setOpen(false); }}>
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
