'use client';
import { Check, ChevronDown } from 'lucide-react';
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

function labelText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? labelText(child.props.children)
        : String(child)
    )
    .join('');
}

/** Keeps native form submission/validation while rendering a consistent, keyboard accessible picker. */
export default function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { children, value, defaultValue, disabled, className, onChange, ...rest } = props;
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const [internal, setInternal] = useState(String(defaultValue ?? ''));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [label, setLabel] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child))
      return [];
    const text = labelText(child.props.children);
    return [
      { value: String(child.props.value ?? text), label: text, disabled: child.props.disabled },
    ];
  });
  const selectedValue = value === undefined ? internal : String(value);
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];
  useEffect(() => {
    const element = native.current;
    setLabel(element?.labels?.[0]?.firstChild?.textContent?.trim() ?? 'Pilih opsi');
    const reset = () => {
      setInternal(String(defaultValue ?? ''));
      setOpen(false);
    };
    element?.form?.addEventListener('reset', reset);
    return () => element?.form?.removeEventListener('reset', reset);
  }, [defaultValue]);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);
  useEffect(() => {
    if (open) menu.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    const height = Math.min(280, options.length * 42 + 12);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const upwards = below < height && above > below;
    const maxHeight = Math.max(80, Math.min(height, upwards ? above : below));
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upwards ? rect.top - maxHeight - 6 : rect.bottom + 6,
      width,
      maxHeight,
    });
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === selected?.value)
      )
    );
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event('change', { bubbles: true }));
    setInternal(option.value);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <span className={`select-control ${className ?? ''}`}>
      <select
        {...rest}
        ref={native}
        className="select-native"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onInvalid={(event) => {
          event.preventDefault();
          trigger.current?.focus();
          show();
        }}
        onChange={(event) => {
          setInternal(event.target.value);
          onChange?.(event);
        }}
      >
        {children}
      </select>
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        disabled={disabled}
        role="combobox"
        aria-label={props['aria-label'] ?? label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-required={props.required}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === 'Tab') setOpen(false);
          else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            const enabled = options
              .map((option, index) => (option.disabled ? -1 : index))
              .filter((index) => index >= 0);
            const next =
              event.key === 'Home'
                ? enabled[0]
                : event.key === 'End'
                  ? enabled.at(-1)
                  : enabled[
                      (enabled.indexOf(active) +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        enabled.length) %
                        enabled.length
                    ];
            if (next !== undefined) setActive(next);
          } else if ((event.key === 'Enter' || event.key === ' ') && open) {
            event.preventDefault();
            choose(active);
          } else if (event.key.length === 1 && event.key !== ' ') {
            const index = options.findIndex(
              (option) =>
                !option.disabled &&
                option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase())
            );
            if (index >= 0) {
              event.preventDefault();
              if (!open) show();
              setActive(index);
            }
          }
        }}
      >
        <span>{selected?.label ?? 'Pilih opsi'}</span>
        <ChevronDown size={16} className={open ? 'rotated' : ''} />
      </button>
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="listbox"
            aria-label={props['aria-label'] ?? label}
            className="select-menu"
            style={position}
            onClick={(event) => event.stopPropagation()}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={option.value === selected?.value}
                aria-disabled={option.disabled}
                className={`select-option ${index === active ? 'highlighted' : ''} ${option.value === selected?.value ? 'chosen' : ''}`}
                onPointerMove={() => !option.disabled && setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === selected?.value && <Check size={16} />}
              </div>
            ))}
            {!options.length && <div className="select-option">Tidak ada pilihan tersedia</div>}
          </div>,
          document.body
        )}
    </span>
  );
}
