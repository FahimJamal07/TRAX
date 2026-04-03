import React from 'react'

const variantClass = {
  Express: 'train-type-express',
  Passenger: 'train-type-passenger',
  Freight: 'train-type-freight',
  Mail: 'train-type-mail',
  High: 'train-tag-high',
  Medium: 'train-tag-medium',
  Low: 'train-tag-low',
  Delayed: 'train-tag-delayed',
  'On Time': 'train-tag-on-time',
  Waiting: 'train-tag-waiting',
  Moving: 'train-tag-moving',
  Scheduled: 'train-tag-scheduled',
}

export default function TagBadge({ label }) {
  const cls = variantClass[label] || 'train-type-neutral'

  return (
    <span className={`train-type-badge ${cls}`} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}
