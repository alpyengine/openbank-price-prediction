/**
 * TradingViewModal.test.jsx
 *
 * Tests for the TradingViewModal component.
 *
 * What we test:
 *   - Modal renders with correct ticker and company name
 *   - TradingView iframe is present with correct src
 *   - Exchange mapping converts suffixes correctly (NEM.DE → XETR:NEM)
 *   - Clicking outside (overlay) calls onClose
 *   - Clicking ✕ button calls onClose
 *   - Pressing Escape key calls onClose
 *
 * What we don't test:
 *   - TradingView widget content (external iframe, not our code)
 *   - Visual styling (covered by design system)
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TradingViewModal from '../TradingViewModal.jsx'

describe('TradingViewModal', () => {
  const defaultProps = {
    ticker:  'MU',
    company: 'Micron Technology',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ticker and company name', () => {
    render(<TradingViewModal {...defaultProps} />)
    expect(screen.getByText('MU')).toBeInTheDocument()
    expect(screen.getByText(/Micron Technology/)).toBeInTheDocument()
  })

  it('renders TradingView label', () => {
    render(<TradingViewModal {...defaultProps} />)
    expect(screen.getByText('TradingView')).toBeInTheDocument()
  })

  it('renders iframe with TradingView src for US ticker', () => {
    render(<TradingViewModal {...defaultProps} />)
    const iframe = screen.getByTitle(/TradingView chart for MU/)
    expect(iframe).toBeInTheDocument()
    expect(iframe.src).toContain('tradingview.com')
    expect(iframe.src).toContain('MU')
  })

  it('maps European ticker NEM.DE to XETR:NEM in iframe src', () => {
    render(<TradingViewModal ticker="NEM.DE" company="Nemetschek" onClose={vi.fn()} />)
    const iframe = screen.getByTitle(/TradingView chart for NEM.DE/)
    expect(iframe.src).toContain('XETR%3ANEM')
  })

  it('maps European ticker IFX.DE to XETR:IFX', () => {
    render(<TradingViewModal ticker="IFX.DE" company="Infineon" onClose={vi.fn()} />)
    const iframe = screen.getByTitle(/TradingView chart for IFX.DE/)
    expect(iframe.src).toContain('XETR%3AIFX')
  })

  it('calls onClose when ✕ button is clicked', () => {
    const onClose = vi.fn()
    render(<TradingViewModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close chart'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<TradingViewModal {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay background is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<TradingViewModal {...defaultProps} onClose={onClose} />)
    // Click the fixed overlay (first child = backdrop div)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when modal content is clicked', () => {
    const onClose = vi.fn()
    render(<TradingViewModal {...defaultProps} onClose={onClose} />)
    // Click the modal panel itself — should not propagate to overlay
    fireEvent.click(screen.getByText('MU').closest('div'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
