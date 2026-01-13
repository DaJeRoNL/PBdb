import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Check, ChevronDown, Search } from 'lucide-react';
import { getRequirementsByMarket, getBenefitsByMarket } from './requirementsBenefitsData';

interface RequirementsBenefitsSelectorProps {
  type: 'requirements' | 'benefits';
  value: string[];
  onChange: (values: string[]) => void;
  market?: 'USA' | 'PHILIPPINES' | 'BOTH';
  placeholder?: string;
}

export default function RequirementsBenefitsSelector({ 
  type, 
  value, 
  onChange, 
  market = 'BOTH',
  placeholder 
}: RequirementsBenefitsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [filter, setFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get options based on type and market
  const options = type === 'requirements' 
    ? getRequirementsByMarket(market)
    : getBenefitsByMarket(market);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(filter.toLowerCase()) &&
    !value.includes(opt)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const handleRemove = (item: string) => {
    onChange(value.filter(v => v !== item));
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomInput('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Selected Items as Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map(item => (
            <div 
              key={item} 
              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-blue-200 hover:bg-blue-200 transition-colors"
            >
              <span>{item}</span>
              <button 
                onClick={() => handleRemove(item)}
                className="hover:bg-blue-300 rounded-full p-0.5 transition-colors"
              >
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-slate-300 rounded-lg text-left flex justify-between items-center hover:border-blue-400 transition-colors bg-white"
      >
        <span className="text-sm text-slate-600">
          {value.length === 0 
            ? (placeholder || `Select ${type}...`) 
            : `${value.length} ${type} selected`
          }
        </span>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          
          {/* Search Filter */}
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400"/>
              <input 
                type="text"
                placeholder={`Search ${type}...`}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Market Filter Info */}
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-700 font-medium">
              Showing {market === 'BOTH' ? 'Philippines + USA' : market} {type}
            </p>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-64 p-2">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {filter ? 'No matches found' : `No ${type} available`}
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value.includes(option);
                return (
                  <div 
                    key={option}
                    onClick={() => handleToggle(option)}
                    className={`p-2.5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                      isSelected 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={12} className="text-white"/>}
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                      {option}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Custom Input Section */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Add Custom</p>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder={`Custom ${type.slice(0, -1)}...`}
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                onClick={e => e.stopPropagation()}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
              <button 
                type="button"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium text-sm transition-colors"
              >
                <Plus size={14}/> Add
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}