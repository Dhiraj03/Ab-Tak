interface GenerateFormProps {
  disabled?: boolean
  onSubmit: () => void
}

export function GenerateForm({ disabled, onSubmit }: GenerateFormProps) {
  return (
    <section className="panel generate-panel minimal">
      <div className="generate-content">
        <p className="generate-label">Live Bulletin</p>
        <button 
          className="generate-button"
          type="button"
          disabled={disabled}
          onClick={onSubmit}
        >
          {disabled ? (
            <>
              <span className="spinner-small" />
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Bulletin
            </>
          )}
        </button>
      </div>
    </section>
  )
}