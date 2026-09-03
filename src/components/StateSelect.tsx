'use client';

import React, { useState, useRef, useEffect } from 'react';
import { INDIAN_STATES_AND_UTS, StateOption } from '@/data/indian-states';

interface StateSelectProps {
  value: string;
  onChange: (_stateName: string) => void;
  id?: string;
  required?: boolean;
}

export default function StateSelect({ value, onChange, id = 'state-select', required = false }: StateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredStates = INDIAN_STATES_AND_UTS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (state: StateOption) => {
    onChange(state.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredStates.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStates[highlightedIndex]) {
        handleSelect(filteredStates[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm text-left bg-white transition-all ${
          isOpen
            ? 'border-slate-900 ring-2 ring-slate-900/10'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {value || 'Select your state'}
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          {value && (
            <span
              onClick={handleClear}
              role="button"
              tabIndex={0}
              aria-label="Clear selected state"
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in-50 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search state or UT..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-56 p-1 divide-y divide-slate-50" role="listbox">
            {filteredStates.length > 0 ? (
              filteredStates.map((state, idx) => {
                const isSelected = value.toLowerCase() === state.name.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={state.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(state)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                    } ${isSelected ? 'font-bold text-emerald-800 bg-emerald-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{state.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                        {state.type === 'UT' ? 'UT' : 'State'}
                      </span>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching Indian state or UT found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
