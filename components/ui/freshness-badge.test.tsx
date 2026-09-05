import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { FreshnessBadge } from './freshness-badge'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('freshness clock', () => {
  it('updates the age without a rebuild or a data request and exposes the exact UTC timestamp', () => {
    vi.useFakeTimers()
    const now = Date.parse('2026-09-05T12:00:00Z')
    vi.setSystemTime(now)
    const { container } = render(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ data: { updated: 'Updated {time}', delayed: 'Data delayed' } }}>
        <FreshnessBadge harvestedAt={(now - 120_000) / 1000} />
      </NextIntlClientProvider>,
    )
    expect(screen.getByText('Updated 2 minutes ago')).toBeTruthy()
    expect(container.querySelector('.freshness-badge')?.getAttribute('title')).toContain('UTC')
    act(() => { vi.advanceTimersByTime(4 * 3_600_000) })
    expect(screen.getByText(/Data delayed.*4 hours ago/)).toBeTruthy()
  })
})
