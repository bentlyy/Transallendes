import { formatDateTime } from '@/utils/formatters'
import StatusBadge from './StatusBadge'

interface TimelineEvent {
  status: string
  timestamp: string
  location?: string
  note?: string
}

interface TripTimelineProps {
  events: TimelineEvent[]
}

const STATUS_ORDER = ['planned', 'assigned', 'loading', 'in_progress', 'resting', 'completed', 'cancelled', 'delayed']

export default function TripTimeline({ events }: TripTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {sorted.map((event, i) => {
        const isLast = i === sorted.length - 1
        return (
          <div key={i} style={{ position: 'relative', paddingBottom: isLast ? 0 : 20 }}>
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: 4,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                border: '2px solid var(--background)',
                zIndex: 1,
              }}
            />
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: -15,
                  top: 16,
                  width: 2,
                  bottom: 0,
                  backgroundColor: 'var(--border)',
                }}
              />
            )}
            <div>
              <StatusBadge status={event.status} type="trip" />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {formatDateTime(event.timestamp)}
              </div>
              {event.location && (
                <div style={{ fontSize: 13, color: 'var(--foreground)', marginTop: 2 }}>
                  📍 {event.location}
                </div>
              )}
              {event.note && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, fontStyle: 'italic' }}>
                  {event.note}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
