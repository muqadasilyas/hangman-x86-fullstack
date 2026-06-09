interface Props {
  word: string;
  guessed: Set<string>;
  reveal?: boolean;
}

export const WordDisplay = ({ word, guessed, reveal }: Props) => {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5">
      {word.split("").map((ch, i) => {
        const shown = reveal || guessed.has(ch);
        return (
          <div
            key={i}
            className={`slot w-8 sm:w-12 h-12 sm:h-16 text-xl sm:text-3xl
              ${shown ? "slot-filled animate-bounce-in" : ""}`}
            style={{ animationDelay: shown ? `${i * 30}ms` : undefined }}
          >
            {shown ? ch : ""}
          </div>
        );
      })}
    </div>
  );
};
