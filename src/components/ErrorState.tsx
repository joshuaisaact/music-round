import { PixelButton } from "./PixelButton";
import { PageLayout } from "./PageLayout";

interface ErrorStateProps {
  title: string;
  message?: string;
  buttonText?: string;
  onButtonClick: () => void;
}

export function ErrorState({
  title,
  message,
  buttonText = "BACK TO HOME",
  onButtonClick
}: ErrorStateProps) {
  return (
    <PageLayout showClouds={false}>
      <div className="text-center">
        <p className="pixel-text text-white text-xl mb-8">{title}</p>
        {message && (
          <p className="pixel-text text-white text-sm mb-8 opacity-75">
            {message}
          </p>
        )}
        <PixelButton onClick={onButtonClick}>
          {buttonText}
        </PixelButton>
      </div>
    </PageLayout>
  );
}
