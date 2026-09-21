import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SearchableSelectProps {
  value: string | string[];
  onChange: (val: string | string[]) => void;
  options: string[];
  allowOther?: boolean;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options = [],
  allowOther = false,
  multiple = false,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedArray = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : [];
  const selectedString = multiple ? '' : (typeof value === 'string' ? value : '');

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase()) &&
    (multiple ? !selectedArray.includes(opt) : true)
  );

  const isExactMatch = options.some(opt => opt.toLowerCase() === query.trim().toLowerCase());
  const canAddOther = allowOther && query.trim() !== '' && !isExactMatch && (multiple ? !selectedArray.includes(query.trim()) : selectedString !== query.trim());

  const handleSelect = (opt: string) => {
    if (multiple) {
      if (!selectedArray.includes(opt)) {
        onChange([...selectedArray, opt]);
      }
      setQuery('');
    } else {
      onChange(opt);
      setQuery('');
      setIsOpen(false);
    }
    inputRef.current?.focus();
  };

  const handleRemove = (optToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedArray.filter(opt => opt !== optToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && query === '' && multiple && selectedArray.length > 0) {
      onChange(selectedArray.slice(0, -1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && !canAddOther) {
        handleSelect(filteredOptions[0]);
      } else if (canAddOther) {
        handleSelect(query.trim());
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`flex items-center min-h-[40px] flex-wrap gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg bg-white ${disabled ? 'bg-slate-100 opacity-80 cursor-not-allowed' : 'cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}`}
      >
        {multiple && selectedArray.map(opt => (
          <span key={opt} className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium border border-slate-200">
            <span>{opt}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => handleRemove(opt, e)}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? query : (!multiple ? selectedString : '')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (!multiple && !isOpen) onChange(''); // clear on new type
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              if (!multiple) setQuery('');
            }
          }}
          placeholder={multiple ? (selectedArray.length === 0 ? placeholder : '') : placeholder}
          className="flex-1 bg-transparent min-w-[50px] outline-none text-sm text-slate-800 placeholder:text-slate-400"
        />
        <div className="shrink-0 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length === 0 && !canAddOther && (
            <div className="p-3 text-sm text-slate-500 text-center">No options found.</div>
          )}
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => handleSelect(opt)}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
          {canAddOther && (
            <div
              onClick={() => handleSelect(query.trim())}
              className="px-3 py-2 text-sm text-blue-700 font-medium hover:bg-blue-50 border-t border-slate-100 cursor-pointer transition-colors flex items-center justify-between"
            >
              <span>Add "{query.trim()}"</span>
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Custom</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
