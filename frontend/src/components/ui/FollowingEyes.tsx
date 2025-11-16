import { useEffect, useRef, useState } from "react";

interface FollowingEyesProps {
  children: React.ReactNode;
  eyeSize?: number; // Size of each eye in pixels
  pupilSize?: number; // Size of the pupil in pixels
  eyeSpacing?: number; // Horizontal spacing multiplier (default 1.2)
  eyeVerticalPosition?: number; // Vertical position multiplier (default 0.8)
}

export function FollowingEyes({
  children,
  eyeSize = 8,
  pupilSize = 3,
  eyeSpacing = 1.2,
  eyeVerticalPosition = 0.8,
}: FollowingEyesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPupilPosition, setLeftPupilPosition] = useState({ x: 0, y: 0 });
  const [rightPupilPosition, setRightPupilPosition] = useState({ x: 0, y: 0 });
  const [eyeStretch, setEyeStretch] = useState({
    left: { amount: 0, angle: 0 },
    right: { amount: 0, angle: 0 },
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate positions for left and right eyes
      // Eyes are positioned slightly left and right of center, upper portion of avatar
      const eyeOffset = rect.width * 0.09; // Distance from center (closer together)
      const eyeVerticalOffset = -rect.height * 0.05; // Move down a bit

      const leftEyeX = centerX - eyeOffset;
      const leftEyeY = centerY + eyeVerticalOffset;
      const rightEyeX = centerX + eyeOffset;
      const rightEyeY = centerY + eyeVerticalOffset;

      // Calculate angles and constrain pupil movement
      const calculatePupilPosition = (eyeX: number, eyeY: number) => {
        const dx = e.clientX - eyeX;
        const dy = e.clientY - eyeY;
        const angle = Math.atan2(dy, dx);

        // Maximum distance pupil can move from center of eye
        // Increased multiplier to allow more "nosey" movement
        const maxDistance = (eyeSize - pupilSize) / 2;
        const distance = Math.min(
          Math.sqrt(dx * dx + dy * dy) * 0.5, // Increased from 0.3 to 0.5 for more reach
          maxDistance,
        );

        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        };
      };

      const leftPos = calculatePupilPosition(leftEyeX, leftEyeY);
      const rightPos = calculatePupilPosition(rightEyeX, rightEyeY);

      setLeftPupilPosition(leftPos);
      setRightPupilPosition(rightPos);

      // Calculate stretch based on actual cursor distance (for "nosey" effect)
      const leftDx = e.clientX - leftEyeX;
      const leftDy = e.clientY - leftEyeY;
      const leftDistance = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
      const leftAngle = Math.atan2(leftDy, leftDx);

      const rightDx = e.clientX - rightEyeX;
      const rightDy = e.clientY - rightEyeY;
      const rightDistance = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
      const rightAngle = Math.atan2(rightDy, rightDx);

      // Normalize distance to a reasonable range (0-300px = 0-1 stretch factor)
      const leftStretchAmount = Math.min(leftDistance / 500, 1) * 0.2;
      const rightStretchAmount = Math.min(rightDistance / 500, 1) * 0.2;

      setEyeStretch({
        left: { amount: leftStretchAmount, angle: leftAngle },
        right: { amount: rightStretchAmount, angle: rightAngle },
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [eyeSize, pupilSize, eyeSpacing, eyeVerticalPosition]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}

      {/* Eyes overlay */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <div className="relative w-full h-full">
          {/* Left Eye */}
          <div
            className="absolute rounded-full transition-transform duration-100 ease-out"
            style={{
              width: `${eyeSize}px`,
              height: `${eyeSize}px`,
              left: `calc(50% - ${eyeSize / 2}px - ${eyeSize * eyeSpacing}px)`,
              top: `calc(50% - ${eyeSize / 2}px - ${eyeSize * eyeVerticalPosition}px)`,
              backgroundColor: "white",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
              transform: `rotate(${eyeStretch.left.angle}rad) translateX(${eyeStretch.left.amount * eyeSize * 0.5}px) scaleX(${1 + eyeStretch.left.amount}) scaleY(${1 - eyeStretch.left.amount * 0.3}) rotate(${-eyeStretch.left.angle}rad)`,
            }}
          >
            {/* Left Pupil */}
            <div
              className="absolute rounded-full transition-transform duration-100 ease-out"
              style={{
                width: `${pupilSize}px`,
                height: `${pupilSize}px`,
                left: `calc(50% - ${pupilSize / 2}px)`,
                top: `calc(50% - ${pupilSize / 2}px)`,
                backgroundColor: "#000",
                transform: `translate(${leftPupilPosition.x}px, ${leftPupilPosition.y}px)`,
              }}
            />
          </div>

          {/* Right Eye */}
          <div
            className="absolute rounded-full transition-transform duration-100 ease-out"
            style={{
              width: `${eyeSize}px`,
              height: `${eyeSize}px`,
              left: `calc(50% - ${eyeSize / 2}px + ${eyeSize * eyeSpacing}px)`,
              top: `calc(50% - ${eyeSize / 2}px - ${eyeSize * eyeVerticalPosition}px)`,
              backgroundColor: "white",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
              transform: `rotate(${eyeStretch.right.angle}rad) translateX(${eyeStretch.right.amount * eyeSize * 0.5}px) scaleX(${1 + eyeStretch.right.amount}) scaleY(${1 - eyeStretch.right.amount * 0.3}) rotate(${-eyeStretch.right.angle}rad)`,
            }}
          >
            {/* Right Pupil */}
            <div
              className="absolute rounded-full transition-transform duration-100 ease-out"
              style={{
                width: `${pupilSize}px`,
                height: `${pupilSize}px`,
                left: `calc(50% - ${pupilSize / 2}px)`,
                top: `calc(50% - ${pupilSize / 2}px)`,
                backgroundColor: "#000",
                transform: `translate(${rightPupilPosition.x}px, ${rightPupilPosition.y}px)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
