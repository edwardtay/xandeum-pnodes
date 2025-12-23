import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { FilterOptions } from '../types';

interface SearchFilterProps {
  filters: FilterOptions;
  onFilterChange: <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => void;
  onReset: () => void;
  versions: string[];
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFilterChange,
  onReset,
  versions,
  searchInputRef,
}) => {
  const hasActiveFilters = 
    filters.search ||
    filters.healthStatus !== 'all' ||
    filters.versionFilter;

  return (
    <div className="search-filter compact">
      <div className="search-input-wrapper">
        <Search size={12} className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="search-input"
        />
        {filters.search && (
          <button className="clear-btn" onClick={() => onFilterChange('search', '')}>
            <X size={10} />
          </button>
        )}
      </div>

      <div className="filter-group">
        <div className="select-wrapper mini">
          <select
            value={filters.healthStatus}
            onChange={(e) => onFilterChange('healthStatus', e.target.value as FilterOptions['healthStatus'])}
          >
            <option value="all">All</option>
            <option value="healthy">OK</option>
            <option value="unhealthy">Error</option>
            <option value="unknown">Offline</option>
          </select>
          <ChevronDown size={10} className="select-icon" />
        </div>

        <div className="select-wrapper mini">
          <select
            value={filters.versionFilter}
            onChange={(e) => onFilterChange('versionFilter', e.target.value)}
          >
            <option value="">Version</option>
            {versions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <ChevronDown size={10} className="select-icon" />
        </div>

        <div className="select-wrapper mini">
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value as FilterOptions['sortBy'])}
          >
            <option value="health">Health</option>
            <option value="score">Score</option>
            <option value="latency">Latency</option>
            <option value="version">Version</option>
          </select>
          <ChevronDown size={10} className="select-icon" />
        </div>

        <button
          className="sort-btn"
          onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>

        {hasActiveFilters && (
          <button className="reset-btn" onClick={onReset}>×</button>
        )}
      </div>
    </div>
  );
};
