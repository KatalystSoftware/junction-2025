import { useEffect, useRef, useState } from "react";

interface FollowingEyesProps {
  children: React.ReactNode;
  eyeSize?: number; // Size of each eye in pixels
  pupilSize?: number; // Size of the pupil in pixels
  eyeSpacing?: number; // Horizontal spacing multiplier (default 1.2)
  eyeVerticalPosition?: number; // Vertical position multiplier (default 0.8)
}

type EyebrowExpression = 'neutral' | 'angry' | 'relaxed' | 'curious' | 'concerned';

export function FollowingEyes({
  children,
  eyeSize = 6,
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
  const [eyebrowExpression, setEyebrowExpression] = useState<EyebrowExpression>('neutral');

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

  // Randomly change eyebrow expression every 3-8 seconds
  useEffect(() => {
    const expressions: EyebrowExpression[] = ['neutral', 'angry', 'relaxed', 'curious', 'concerned'];

    const changeExpression = () => {
      const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
      setEyebrowExpression(randomExpression);

      // Schedule next change with random interval (3-8 seconds)
      const nextInterval = 3000 + Math.random() * 5000;
      return setTimeout(changeExpression, nextInterval);
    };

    const timeoutId = changeExpression();
    return () => clearTimeout(timeoutId);
  }, []);

  // Get eyebrow style based on expression
  const getEyebrowStyle = (side: 'left' | 'right') => {
    const baseWidth = eyeSize * 1.3;
    const baseHeight = eyeSize * 0.4; // Increased from 0.15 to 0.4 to make more visible
    const baseTop = eyeSize * eyeVerticalPosition + eyeSize * 0.9; // Move up by increasing from 0.7 to 0.9

    let rotation = 0;
    let verticalOffset = 0;

    switch (eyebrowExpression) {
      case 'angry':
        // Angled downward toward center (furrowed brow)
        rotation = side === 'left' ? 15 : -15;
        verticalOffset = -eyeSize * 0.1;
        break;
      case 'relaxed':
        // Slightly curved upward
        rotation = side === 'left' ? -5 : 5;
        verticalOffset = eyeSize * 0.1;
        break;
      case 'curious':
        // One raised, one normal
        rotation = side === 'left' ? -8 : 3;
        verticalOffset = side === 'left' ? -eyeSize * 0.15 : 0;
        break;
      case 'concerned':
        // Both angled upward (worried look)
        rotation = side === 'left' ? -10 : 10;
        verticalOffset = -eyeSize * 0.05;
        break;
      default: // neutral
        rotation = 0;
        verticalOffset = 0;
    }

    return {
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      top: `calc(50% - ${baseTop + verticalOffset}px)`,
      transform: `rotate(${rotation}deg)`,
    };
  };

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

          {/* Left Eyebrow */}
          <div
            className="absolute rounded-full transition-all duration-500 ease-in-out"
            style={{
              ...getEyebrowStyle('left'),
              left: `calc(50% - ${eyeSize / 2}px - ${eyeSize * eyeSpacing}px)`,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            }}
          />

          {/* Right Eyebrow */}
          <div
            className="absolute rounded-full transition-all duration-500 ease-in-out"
            style={{
              ...getEyebrowStyle('right'),
              left: `calc(50% - ${eyeSize / 2}px + ${eyeSize * eyeSpacing}px)`,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
