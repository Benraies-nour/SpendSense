type MascotState = 'idle' | 'listening' | 'thinking' | 'confirming' | 'speaking'

type Props = { state: MascotState }

export function MascotAvatar({ state }: Props) {
  const speaking  = state === 'speaking'
  const thinking  = state === 'thinking'
  const listening = state === 'listening'

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <style>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes mascot-talk {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          25%       { transform: translateY(-4px) rotate(1deg); }
          50%       { transform: translateY(-2px) rotate(-1deg); }
          75%       { transform: translateY(-5px) rotate(0.5deg); }
        }
        @keyframes mascot-think {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-3px) rotate(-3deg); }
          66%       { transform: translateY(-1px) rotate(3deg); }
        }
        @keyframes mascot-listen {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.1); }
        }
        @keyframes mouth-talk {
          0%, 100% { d: path("M 28 52 Q 40 60 52 52"); }
          50%       { d: path("M 28 52 Q 40 64 52 52"); }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        .mascot-body {
          animation: mascot-float 3s ease-in-out infinite;
        }
        .mascot-body.speaking {
          animation: mascot-talk 0.4s ease-in-out infinite;
        }
        .mascot-body.thinking {
          animation: mascot-think 1.2s ease-in-out infinite;
        }
        .mascot-body.listening {
          animation: mascot-listen 1s ease-in-out infinite;
        }
        .mascot-eye {
          animation: blink 4s ease-in-out infinite;
          transform-origin: center;
        }
        .mascot-eye.right { animation-delay: 0.1s; }
        .mascot-mouth-open {
          animation: mouth-talk 0.3s ease-in-out infinite alternate;
        }
      `}</style>

      <svg
        className={`mascot-body ${state}`}
        width="120" height="120" viewBox="0 0 80 80"
        fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenna */}
        <line x1="40" y1="8" x2="40" y2="18" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="40" cy="6" r="4" fill="var(--primary)" opacity="0.9"/>

        {/* Head shadow */}
        <ellipse cx="40" cy="73" rx="20" ry="4" fill="var(--foreground)" opacity="0.06"/>

        {/* Head */}
        <rect x="10" y="16" width="60" height="52" rx="22" fill="var(--card)" stroke="var(--primary)" strokeWidth="2"/>

        {/* Cheeks */}
        <circle cx="18" cy="46" r="6" fill="#f43f5e" opacity="0.18"/>
        <circle cx="62" cy="46" r="6" fill="#f43f5e" opacity="0.18"/>

        {/* Eyes */}
        <g className="mascot-eye left">
          <circle cx="29" cy="38" r="7" fill="var(--foreground)" opacity="0.9"/>
          <circle cx="31" cy="36" r="2.5" fill="var(--card)"/>
        </g>
        <g className="mascot-eye right">
          <circle cx="51" cy="38" r="7" fill="var(--foreground)" opacity="0.9"/>
          <circle cx="53" cy="36" r="2.5" fill="var(--card)"/>
        </g>

        {/* Thinking dots */}
        {thinking && (
          <>
            <circle cx="28" cy="54" r="3" fill="var(--primary)" opacity="0.8" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0s' }}/>
            <circle cx="40" cy="54" r="3" fill="var(--primary)" opacity="0.8" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0.2s' }}/>
            <circle cx="52" cy="54" r="3" fill="var(--primary)" opacity="0.8" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0.4s' }}/>
          </>
        )}

        {/* Mouth — smile */}
        {!speaking && !thinking && (
          <path d="M 28 52 Q 40 62 52 52" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8"/>
        )}

        {/* Mouth — talking (open oval) */}
        {speaking && (
          <ellipse className="mascot-mouth-open" cx="40" cy="54" rx="10" ry="6" fill="var(--foreground)" opacity="0.85"/>
        )}

        {/* Listening arc */}
        {listening && (
          <path d="M 28 52 Q 40 58 52 52" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        )}
      </svg>
    </div>
  )
}
