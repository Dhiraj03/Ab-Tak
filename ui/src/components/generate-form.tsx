interface GenerateFormProps {
  task: string
  disabled: boolean
  onTaskChange: (value: string) => void
  onSubmit: () => void
}

export function GenerateForm({
  task,
  disabled,
  onTaskChange,
  onSubmit,
}: GenerateFormProps) {
  return (
    <section className="panel hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">Live bulletin desk</p>
        <h2>Generate a broadcast-style audio bulletin from live news inputs.</h2>
        <p className="muted">
          Start with a task, review the transcript and sources, then ask follow-up
          questions against the same run.
        </p>
      </div>
      <div className="generate-form">
        <label className="field-label" htmlFor="task-input">
          Bulletin task
        </label>
        <textarea
          id="task-input"
          className="text-input"
          rows={3}
          value={task}
          disabled={disabled}
          onChange={(event) => onTaskChange(event.target.value)}
        />
        <button className="primary-button" type="button" disabled={disabled} onClick={onSubmit}>
          {disabled ? 'Generating bulletin...' : 'Generate Bulletin'}
        </button>
      </div>
    </section>
  )
}
