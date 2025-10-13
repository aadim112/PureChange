import React from 'react';
import './Button.css';
import clsx from 'clsx';

/**
 * A highly reusable button component with multiple visual variants.
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The content inside the button.
 * @param {function} props.onClick - The function to execute on click.
 * @param {('primary'|'secondary'|'destructive'|'text')} [props.variant='primary'] - The visual style of the button.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {string} [props.className=''] - Additional class names for custom styling.
 * @param {('button'|'submit'|'reset')} [props.type='button'] - The button's type.
 */

function Button({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) {
  const buttonClassName = clsx(
    'btn',
    `btn--${variant}`,
    className
  );

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

export default Button;