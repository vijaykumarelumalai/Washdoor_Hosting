import React from 'react';

export const PaginationBar = ({
  total,
  page,
  pageSizeKey,
  totalPages,
  perPage,
  onPageChange,
  onPageSizeChange,
}) => {
  // Calculate items per page matching the original logic
  const itemsPerPage = perPage === 'all' ? total : parseInt(pageSizeKey, 10);

  const handlePageSizeChange = (e) => {
    onPageSizeChange(e.target.value);
    onPageChange(1);
  };

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {total === 0 ? 0 : ((page - 1) * itemsPerPage + 1)}–{Math.min(page * itemsPerPage, total)} of {total}
      </span>

      <div className="pagination-right">
        <div className="pagination-size-wrap">
          <label className="pagination-size-label">Show:</label>
          <select
            className="pagination-size-select"
            value={pageSizeKey}
            onChange={handlePageSizeChange}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title="First page"
          >
            «
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(page => Math.max(1, page - 1))}
            disabled={page === 1}
            title="Previous page"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <span key={`ellipsis-c-${idx}`} className="pagination-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  className={`pagination-btn pagination-num ${item === page ? 'active' : ''}`}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              )
            )}

          <button
            className="pagination-btn"
            onClick={() => onPageChange(page => Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            title="Next page"
          >
            ›
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            title="Last page"
          >
            «
          </button>
        </div>
      </div>
    </div>
  );
}