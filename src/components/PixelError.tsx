interface PixelErrorProps {
  children: React.ReactNode;
  id?: string;
}

/**
 * A pixel-art styled error message component with consistent styling
 *
 * @example
 * {error && <PixelError id="join-error">{error}</PixelError>}
 */
export const PixelError = ({ children, id }: PixelErrorProps) => {
  return (
    <div
      id={id}
      role="alert"
      className="pixel-error bg-red-200 text-base p-3 leading-relaxed uppercase text-center"
    >
      {children}
    </div>
  );
};
