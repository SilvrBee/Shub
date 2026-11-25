import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  align?: 'start' | 'end';
  matchAnchorWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  maxHeight?: number;
  offset?: number;
  role?: string;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}

interface PopoverCoords {
  top: number;
  left: number;
  width?: number;
  minWidth?: number;
  maxWidth: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
  ready: boolean;
}

const VIEWPORT_PADDING = 8;

export const PortalPopover: React.FC<PortalPopoverProps> = ({
  open,
  onClose,
  anchorEl,
  align = 'start',
  matchAnchorWidth = false,
  minWidth = 180,
  maxWidth = 360,
  maxHeight = 320,
  offset = 6,
  role,
  ariaLabel,
  className = '',
  children,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<PopoverCoords>({
    top: -9999,
    left: -9999,
    maxWidth,
    maxHeight,
    placement: 'bottom',
    ready: false,
  });

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    let rafId = 0;

    const updatePosition = () => {
      if (!anchorEl.isConnected) {
        onClose();
        return;
      }

      const vwW = window.innerWidth;
      const vwH = window.innerHeight;
      const anchorRect = anchorEl.getBoundingClientRect();
      const popEl = popoverRef.current;

      const availableMaxW = Math.max(160, vwW - VIEWPORT_PADDING * 2);
      const effectiveMaxW = Math.min(maxWidth, availableMaxW);
      const effectiveMinW = Math.min(minWidth, availableMaxW);

      const spaceBelow = Math.max(80, vwH - anchorRect.bottom - offset - VIEWPORT_PADDING);
      const spaceAbove = Math.max(80, anchorRect.top - offset - VIEWPORT_PADDING);

      const measuredHeight = popEl ? popEl.scrollHeight : maxHeight;
      const desiredHeight = Math.min(maxHeight, measuredHeight || maxHeight);

      let placement: 'bottom' | 'top' = 'bottom';
      if (spaceBelow < Math.min(desiredHeight, 210) && spaceAbove > spaceBelow) {
        placement = 'top';
      }

      const availableSpace = placement === 'bottom' ? spaceBelow : spaceAbove;
      const clampedMaxHeight = Math.max(120, Math.min(maxHeight, availableSpace));
      const renderedHeight = popEl
        ? Math.min(popEl.offsetHeight || desiredHeight, clampedMaxHeight)
        : Math.min(desiredHeight, clampedMaxHeight);

      let top =
        placement === 'bottom'
          ? anchorRect.bottom + offset
          : anchorRect.top - offset - renderedHeight;

      top = Math.max(
        VIEWPORT_PADDING,
        Math.min(top, Math.max(VIEWPORT_PADDING, vwH - renderedHeight - VIEWPORT_PADDING))
      );

      const targetWidth = matchAnchorWidth
        ? Math.min(effectiveMaxW, Math.max(anchorRect.width, effectiveMinW))
        : undefined;

      const measuredWidth = popEl ? popEl.offsetWidth : targetWidth ?? effectiveMinW;
      const effectiveWidth = Math.min(effectiveMaxW, Math.max(measuredWidth, targetWidth ?? 0));

      let left =
        align === 'end' ? anchorRect.right - effectiveWidth : anchorRect.left;

      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, Math.max(VIEWPORT_PADDING, vwW - effectiveWidth - VIEWPORT_PADDING))
      );

      setCoords({
        top: Math.round(top),
        left: Math.round(left),
        width: targetWidth ? Math.round(targetWidth) : undefined,
        minWidth: matchAnchorWidth ? undefined : Math.round(effectiveMinW),
        maxWidth: Math.round(effectiveMaxW),
        maxHeight: Math.round(clampedMaxHeight),
        placement,
        ready: true,
      });
    };

    updatePosition();
    rafId = window.requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && popoverRef.current) {
      ro = new ResizeObserver(updatePosition);
      ro.observe(popoverRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      ro?.disconnect();
    };
  }, [open, anchorEl, align, matchAnchorWidth, minWidth, maxWidth, maxHeight, offset, onClose]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      // Allow clicks inside other portal popovers opened above this one
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest('[data-portal-popover="true"]')) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchorEl?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      data-portal-popover="true"
      data-placement={coords.placement}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: coords.width !== undefined ? `${coords.width}px` : undefined,
        minWidth: coords.minWidth !== undefined ? `${coords.minWidth}px` : undefined,
        maxWidth: `${coords.maxWidth}px`,
        maxHeight: `${coords.maxHeight}px`,
        zIndex: 9999,
        visibility: coords.ready ? 'visible' : 'hidden',
      }}
      className={`cadence-popover cadence-popover-enter overflow-hidden flex flex-col ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};
