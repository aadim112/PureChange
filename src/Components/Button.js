import React from 'react';
import styles from './Button.module.css';
import clsx from 'clsx';


function Button({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) {
  const buttonClassName = clsx(
    styles.btn,
    styles[`btn--${variant}`],
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