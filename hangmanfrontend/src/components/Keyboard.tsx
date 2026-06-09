import { sfx } from "@/lib/audio";

interface Props {
  guessed: Set<string>;
  word: string;
  onGuess: (letter: string, evt?: { x: number; y: number }) => void;
  disabled?: boolean;
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export const Keyboard = ({ guessed, word, onGuess, disabled }: Props) => {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 w-full max-w-2xl mx-auto select-none">
      {ROWS.map((row, idx) => (
        <div key={idx} className="flex justify-center gap-1.5 sm:gap-2">
          {row.split("").map((ch) => {
            const used = guessed.has(ch);
            const inWord = word.includes(ch);
            return (
              <button
                key={ch}
                onMouseEnter={() => !used && !disabled && sfx.hover()}
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  onGuess(ch, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                }}
                disabled={used || disabled}
                className={`key h-11 w-9 sm:h-14 sm:w-12 text-base sm:text-xl
                  ${used ? (inWord ? "key-correct animate-pop" : "key-wrong animate-shake") : ""}
                  ${used ? "opacity-95" : ""}
                `}
                aria-label={`Guess letter ${ch}`}
              >
                {ch}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
