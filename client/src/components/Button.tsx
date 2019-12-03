import React, { useState } from 'react';

type ButtonProps = {
  onClick(event: React.MouseEvent<HTMLButtonElement>): void;
  children: React.ReactNode;
  className: string;
};
const Button = ({
  onClick: _onClick,
  children,
  className,
  ...rest
}: ButtonProps) => {
  const [submitting, setSubmitting] = useState(false);
  if (submitting) className = `${className} cursor-not-allowed`;
  return (
    <button
      disabled={submitting}
      onClick={async e => {
        setSubmitting(true);
        await _onClick(e);
        setSubmitting(false);
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
