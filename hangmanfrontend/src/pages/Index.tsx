import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart, ArrowLeft, Lightbulb, RotateCcw,
  Play, BookOpen, LogOut, Sparkles, Volume2, VolumeX,
} from "lucide-react";
import { THEMES, ThemeKey, livesForLevel, difficultyForLevel, MAX_LEVEL } from "@/lib/hangman-data";
import { HangmanFigure } from "@/components/HangmanFigure";
import { Keyboard } from "@/components/Keyboard";
import { WordDisplay } from "@/components/WordDisplay";
import { Confetti, useSparks } from "@/components/Effects";
import { sfx, setMuted, startMusic, stopMusic } from "@/lib/audio";

const API = "http://localhost:3001/api";

// ─── Theme key → backend theme number ────────────────────────────────────────
// MUST match themeTable in hangman_lib.asm exactly:
//   themeTable DWORD 0, offset busWords, offset techWords, offset progWords,
//                        offset netWords, offset elecWords, offset softWords
//   Index 0 unused. Themes are 1-based.
const THEME_NUM: Record<ThemeKey, number> = {
  business:    1,   // busWords  → index 1
  technology:  2,   // techWords → index 2
  programming: 3,   // progWords → index 3
  networking:  4,   // netWords  → index 4
  electronics: 5,   // elecWords → index 5
  software:    6,   // softWords → index 6
};

// ─── Backend response shape ───────────────────────────────────────────────────
interface GameState {
  word:      string;   // masked "c_m__ter" while playing; full word on loss
  lives:     number;
  status:    "playing" | "won" | "lost";
  lastGuess: string;
  level:     number;
  theme:     number;
}

type Screen = "menu" | "instructions" | "themes" | "play" | "gameover" | "win" | "exit";

// ─────────────────────────────────────────────────────────────────────────────
const Index = () => {
  const [screen,     setScreen]     = useState<Screen>("menu");
  const [theme,      setTheme]      = useState<ThemeKey>("technology");
  const [level,      setLevel]      = useState(1);

  // Backend-driven state
  const [word,       setWord]       = useState("");
  const [lives,      setLives]      = useState(8);
  const [status,     setStatus]     = useState<"playing" | "won" | "lost">("playing");
  const [guessed,    setGuessed]    = useState<Set<string>>(new Set());

  const [shake,      setShake]      = useState(false);
  const [muted,      setMutedState] = useState(false);
  const [musicOn,    setMusicOn]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  const { burst, Sparks } = useSparks();
  const playRef = useRef<HTMLDivElement>(null);

  const maxLives = livesForLevel(level);

  // ── Apply backend response ──────────────────────────────────────────────────
  const applyState = useCallback(
    (data: GameState, prevLives: number, lastChar?: string, evt?: { x: number; y: number }) => {
      setWord(data.word);
      setLives(data.lives);
      setStatus(data.status);
      setLevel(data.level);

      setGuessed(prev => {
        const next = new Set(prev);

        // IMPORTANT: Only scan the word for revealed letters while playing.
        // On loss the backend returns the FULL word — scanning it would mark
        // every letter as "guessed" and light the keyboard up incorrectly.
        if (data.status !== "lost") {
          for (const ch of data.word) {
            if (ch !== "_" && ch !== " " && /[a-z]/i.test(ch)) {
              next.add(ch.toLowerCase());
            }
          }
        }

        // Always mark the guessed/hinted letter so keyboard shows it as used
        if (lastChar && lastChar !== "-") next.add(lastChar.toLowerCase());
        return next;
      });

      if (lastChar && lastChar !== "-") {
        const wasCorrect = data.lives === prevLives; // lives unchanged → correct
        if (wasCorrect) {
          sfx.correct();
          if (evt) burst(evt.x, evt.y);
        } else {
          sfx.wrong();
          setShake(true);
          setTimeout(() => setShake(false), 450);
        }
      }
    },
    [burst],
  );

  // ── Start / restart game ────────────────────────────────────────────────────
  const beginGame = useCallback(async (t: ThemeKey, lvl = 1) => {
    setLoading(true);
    setGuessed(new Set());
    try {
      const res  = await fetch(`${API}/start?theme=${THEME_NUM[t]}&level=${lvl}`);
      const data: GameState = await res.json();
      if ((data as any).error) { console.error(data); return; }
      setTheme(t);
      setWord(data.word);
      setLives(data.lives);
      setLevel(data.level);
      setStatus("playing");
      setGuessed(new Set());
      setScreen("play");
      sfx.click();
    } catch (e) {
      console.error("start failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Advance to next level ──────────────────────────────────────────────────
  const advanceLevel = useCallback(async (t: ThemeKey, nextLvl: number) => {
    setLoading(true);
    setGuessed(new Set());
    try {
      const res  = await fetch(`${API}/start?theme=${THEME_NUM[t]}&level=${nextLvl}`);
      const data: GameState = await res.json();
      if ((data as any).error) { console.error(data); return; }
      setWord(data.word);
      setLives(data.lives);
      setLevel(data.level);
      setStatus("playing");
      setGuessed(new Set());
    } catch (e) {
      console.error("advance level failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Guess ───────────────────────────────────────────────────────────────────
  const guess = useCallback(
    async (raw: string, evt?: { x: number; y: number }) => {
      const letter = raw.toLowerCase();
      if (!/^[a-z]$/.test(letter)) return;
      if (guessed.has(letter) || status !== "playing" || loading) return;

      const prevLives = lives;
      setLoading(true);
      try {
        const res  = await fetch(`${API}/guess`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ letter }),
        });
        const data: GameState = await res.json();
        if ((data as any).error) { console.error(data); return; }
        applyState(data, prevLives, letter, evt);
      } catch (e) {
        console.error("guess failed", e);
      } finally {
        setLoading(false);
      }
    },
    [guessed, status, loading, lives, applyState],
  );

  // ── Hint ────────────────────────────────────────────────────────────────────
  const giveHint = useCallback(async () => {
    if (status !== "playing" || loading) return;
    const prevLives = lives;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/hint`);
      const data: GameState = await res.json();
      if ((data as any).error) { console.error(data); return; }
      applyState(data, prevLives, data.lastGuess !== "-" ? data.lastGuess : undefined);
      sfx.hint();
    } catch (e) {
      console.error("hint failed", e);
    } finally {
      setLoading(false);
    }
  }, [status, loading, lives, applyState]);

  // ── Keyboard input ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?") { giveHint(); return; }
      guess(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, guess, giveHint]);

  // ── Win / lose transitions ──────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "play") return;
    if (status === "won") {
      sfx.level();
      const t = setTimeout(() => {
        if (level >= MAX_LEVEL) {
          sfx.win();
          setScreen("win");
        } else {
          advanceLevel(theme, level + 1);
        }
      }, 1100);
      return () => clearTimeout(t);
    }
    if (status === "lost") {
      const t = setTimeout(() => {
        sfx.lose();
        setScreen("gameover");
      }, 900);
      return () => clearTimeout(t);
    }
  }, [status, screen, level, theme, advanceLevel]);

  // ── Audio helpers ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    const m = !muted;
    setMutedState(m);
    setMuted(m);
    sfx.click();
  };
  const toggleMusic = () => {
    if (musicOn) { stopMusic(); setMusicOn(false); }
    else         { startMusic(); setMusicOn(true); }
    sfx.click();
  };

  // ── HangmanBridge ──────────────────────────────────────────────────────────
  useEffect(() => {
    (window as any).HangmanBridge = {
      version:   "2.0-backend",
      getState:  () => ({ screen, theme, level, word, lives, maxLives, guessed: [...guessed], status }),
      startGame: (t: ThemeKey = theme) => beginGame(t),
      guess:     (l: string) => guess(l),
      hint:      () => giveHint(),
      restart:   () => beginGame(theme),
      menu:      () => setScreen("menu"),
    };
  }, [screen, theme, level, word, lives, guessed, status, beginGame, guess, giveHint]);

  // wrongCount drives the hangman figure — derived from backend lives
  const wrongCount = maxLives - lives;

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREENS
  // ─────────────────────────────────────────────────────────────────────────────
  if (screen === "menu")         return <MenuScreen onPlay={() => { sfx.click(); setScreen("themes"); }} onInstructions={() => { sfx.click(); setScreen("instructions"); }} onExit={() => { sfx.click(); setScreen("exit"); }} muted={muted} musicOn={musicOn} onToggleMute={toggleMute} onToggleMusic={toggleMusic} />;
  if (screen === "instructions") return <InstructionsScreen onBack={() => { sfx.click(); setScreen("menu"); }} />;
  if (screen === "themes")       return <ThemeScreen onSelect={(t) => beginGame(t)} onBack={() => { sfx.click(); setScreen("menu"); }} />;
  if (screen === "exit")         return <ExitScreen onBack={() => setScreen("menu")} />;
  if (screen === "gameover")     return <EndScreen kind="lose" word={word} onRetry={() => beginGame(theme)} onMenu={() => setScreen("menu")} />;
  if (screen === "win")          return <EndScreen kind="win"  word={word} onRetry={() => beginGame(theme)} onMenu={() => setScreen("menu")} />;

  // PLAY screen
  const themeMeta   = THEMES.find((t) => t.key === theme)!;
  const diff        = difficultyForLevel(level);
  const figureState: "playing" | "win" | "lose" =
    status === "won" ? "win" : status === "lost" ? "lose" : "playing";

  return (
    <main className="min-h-screen px-4 py-6 sm:py-8 bg-cloud relative">
      <Sparks />
      <div ref={playRef} className={`max-w-6xl mx-auto ${shake ? "animate-shake" : ""}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => { sfx.click(); setScreen("menu"); }}
            className="clay-btn bg-white/80 text-foreground flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Menu
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="bg-white/80">{themeMeta.icon} {themeMeta.label}</Pill>
            <Pill className="bg-[hsl(var(--lav))] text-white">Level {level}/{MAX_LEVEL}</Pill>
            <Pill className={
              diff === "Easy"   ? "bg-[hsl(var(--success))] text-white"
            : diff === "Medium" ? "bg-[hsl(var(--warning))] text-white"
            :                     "bg-[hsl(var(--destructive))] text-white"
            }>{diff}</Pill>
            <button onClick={toggleMute} className="clay-btn bg-white/80 !p-2.5" title={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
          {/* Hangman figure + hearts */}
          <div className="rounded-[2rem] p-6 clay-soft bg-white/80 backdrop-blur">
            <div className="aspect-square max-w-md mx-auto">
              <HangmanFigure wrongCount={wrongCount} maxWrong={maxLives} state={figureState} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
              {Array.from({ length: maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-6 w-6 transition-all ${
                    i < lives
                      ? "text-[hsl(var(--primary))] fill-[hsl(var(--primary))] drop-shadow-[0_3px_0_hsl(var(--primary-deep))]"
                      : "text-muted-foreground/30"
                  }`}
                  style={{ transform: i < lives ? "scale(1)" : "scale(0.85)" }}
                />
              ))}
              <span className="ml-3 font-mono text-sm text-foreground/70 font-extrabold">
                {lives}/{maxLives}
              </span>
            </div>
          </div>

          {/* Word + keyboard */}
          <div className="rounded-[2rem] p-6 sm:p-8 clay-soft bg-white/80 backdrop-blur flex flex-col gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-foreground/60 mb-4 font-extrabold">
                Guess the word
              </p>
              <WordDisplay word={word} guessed={guessed} />
            </div>

            <Keyboard word={word} guessed={guessed} onGuess={guess} disabled={status !== "playing" || loading} />

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t-2 border-dashed border-border/60">
              <button
                onClick={giveHint}
                disabled={loading || status !== "playing"}
                className="clay-btn bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Lightbulb className="h-4 w-4" /> Hint <span className="opacity-70">(-1 ❤️)</span>
              </button>
              <button
                onClick={() => beginGame(theme)}
                className="clay-btn bg-white text-foreground flex items-center gap-2 text-sm"
              >
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const Pill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider clay-soft ${className}`}>
    {children}
  </span>
);

// ─── SUB SCREENS ─────────────────────────────────────────────────────────────

const MenuScreen = ({
  onPlay, onInstructions, onExit, muted, musicOn, onToggleMute, onToggleMusic,
}: {
  onPlay: () => void; onInstructions: () => void; onExit: () => void;
  muted: boolean; musicOn: boolean; onToggleMute: () => void; onToggleMusic: () => void;
}) => (
  <main className="min-h-screen relative bg-cloud overflow-hidden">
    <span className="absolute top-10 left-[8%] text-5xl animate-float-y" style={{ animationDelay: "0s" }}>🎈</span>
    <span className="absolute top-20 right-[10%] text-5xl animate-float-y" style={{ animationDelay: "1s" }}>⭐</span>
    <span className="absolute bottom-16 left-[12%] text-5xl animate-float-y" style={{ animationDelay: "2s" }}>🎯</span>
    <span className="absolute bottom-24 right-[8%] text-5xl animate-float-y" style={{ animationDelay: "0.5s" }}>💡</span>

    <div className="absolute top-4 right-4 flex gap-2 z-10">
      <button onClick={onToggleMute} className="clay-btn bg-white/80 !p-2.5" title="Sound">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <button onClick={onToggleMusic} className={`clay-btn !p-2.5 ${musicOn ? "bg-[hsl(var(--mint))] text-white" : "bg-white/80"}`} title="Music">
        🎵
      </button>
    </div>

    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="animate-bounce-in text-center max-w-3xl">
        <span className="inline-block px-4 py-2 mb-6 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-extrabold text-sm clay-soft">
          <Sparkles className="h-4 w-4 inline mr-1.5" /> 6 themes · 5 levels · pure clay fun
        </span>
        <h1 className="text-7xl sm:text-9xl mb-4 text-shadow-pop leading-none">
          <span className="inline-block animate-wobble" style={{ color: "hsl(var(--primary))" }}>HANG</span>
          <span className="inline-block animate-wobble" style={{ color: "hsl(var(--lav))", animationDelay: "0.1s" }}>MAN</span>
        </h1>
        <p className="text-foreground/70 text-lg sm:text-xl mb-10 max-w-lg mx-auto font-bold">
          A squishy, tech-themed word guessing game. Save the clay-man before he meets a bouncy doom.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <button onClick={onPlay} className="clay-btn bg-[hsl(var(--primary))] text-white text-lg py-5 flex items-center justify-center gap-2">
            <Play className="h-5 w-5" /> Play
          </button>
          <button onClick={onInstructions} className="clay-btn bg-[hsl(var(--info))] text-white text-lg py-5 flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5" /> How to play
          </button>
          <button onClick={onExit} className="clay-btn bg-white text-foreground text-lg py-5 flex items-center justify-center gap-2">
            <LogOut className="h-5 w-5" /> Exit
          </button>
        </div>
        <p className="mt-10 text-xs font-mono text-foreground/60 uppercase tracking-widest font-extrabold">
          tip — type letters · press <kbd className="px-2 py-1 rounded bg-white clay-soft">?</kbd> for hint
        </p>
      </div>
    </div>
  </main>
);

const InstructionsScreen = ({ onBack }: { onBack: () => void }) => {
  const items = [
    { icon: "🎮", text: "Click Play and choose one of 6 themes." },
    { icon: "❤️", text: "Levels 1–2 give you 8 lives — easy mode." },
    { icon: "💛", text: "Level 3 drops to 6 lives — medium." },
    { icon: "💔", text: "Levels 4–5 leave you with only 4 lives — hard!" },
    { icon: "⌨️", text: "Click letters or use your keyboard to guess." },
    { icon: "💡", text: "Stuck? Press the hint button or hit \"?\" — costs 1 life." },
    { icon: "🏆", text: "Beat all 5 levels in a row to win the crown." },
  ];
  return (
    <main className="min-h-screen px-4 py-12 flex items-center bg-cloud">
      <div className="max-w-2xl mx-auto w-full animate-bounce-in">
        <button onClick={onBack} className="clay-btn bg-white/90 flex items-center gap-2 text-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-[2rem] p-8 clay-soft bg-white/85">
          <h2 className="text-5xl mb-2 text-shadow-pop" style={{ color: "hsl(var(--primary))" }}>How to play</h2>
          <p className="text-foreground/70 mb-6 font-bold">Squish the right letters before time runs out.</p>
          <ol className="space-y-3">
            {items.map((t, i) => (
              <li key={i} className="flex gap-4 items-center p-3 rounded-2xl bg-gradient-to-r from-white to-transparent clay-soft">
                <span className="flex-none w-12 h-12 rounded-2xl bg-[hsl(var(--accent))] text-2xl flex items-center justify-center clay-soft">
                  {t.icon}
                </span>
                <span className="text-foreground/90 font-bold">{t.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
};

const THEME_COLORS: Record<ThemeKey, string> = {
  technology:  "hsl(var(--info))",
  business:    "hsl(var(--success))",
  programming: "hsl(var(--lav))",
  networking:  "hsl(var(--mint))",
  electronics: "hsl(var(--accent))",
  software:    "hsl(var(--primary))",
};

const ThemeScreen = ({ onSelect, onBack }: { onSelect: (t: ThemeKey) => void; onBack: () => void }) => (
  <main className="min-h-screen px-4 py-12 bg-cloud">
    <div className="max-w-5xl mx-auto animate-bounce-in">
      <button onClick={onBack} className="clay-btn bg-white/90 flex items-center gap-2 text-sm mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="text-5xl sm:text-6xl mb-2 text-shadow-pop" style={{ color: "hsl(var(--primary))" }}>
        Pick a theme
      </h2>
      <p className="text-foreground/70 font-bold mb-8 text-lg">Each one has its own squishy word pool.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {THEMES.map((t, idx) => (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            onMouseEnter={() => sfx.hover()}
            className="group text-left p-6 rounded-[2rem] clay-soft hover:-translate-y-2 active:translate-y-1 transition-all duration-200 text-white animate-bounce-in"
            style={{ background: THEME_COLORS[t.key], animationDelay: `${idx * 60}ms` }}
          >
            <div className="text-6xl mb-3 group-hover:animate-wobble inline-block">{t.icon}</div>
            <div className="font-extrabold text-2xl text-shadow-soft" style={{ textShadow: "0 2px 0 rgba(0,0,0,0.18)" }}>
              {t.label}
            </div>
            <div className="text-sm opacity-90 mt-1 font-bold">{t.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  </main>
);

const ExitScreen = ({ onBack }: { onBack: () => void }) => (
  <main className="min-h-screen flex items-center justify-center px-4 bg-cloud">
    <div className="rounded-[2rem] p-10 max-w-md text-center clay-soft bg-white/90 animate-bounce-in">
      <div className="text-7xl mb-4 animate-float-y inline-block">👋</div>
      <h2 className="text-4xl mb-2 text-shadow-pop" style={{ color: "hsl(var(--primary))" }}>Bye for now!</h2>
      <p className="text-foreground/70 mb-6 font-bold">The clay-man will miss you.</p>
      <button onClick={onBack} className="clay-btn bg-[hsl(var(--primary))] text-white flex items-center gap-2 mx-auto">
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </button>
    </div>
  </main>
);

// ─── EndScreen ────────────────────────────────────────────────────────────────
const EndScreen = ({
  kind, word, onRetry, onMenu,
}: { kind: "win" | "lose"; word: string; onRetry: () => void; onMenu: () => void }) => {
  const win = kind === "win";

  // Responsive font size based on word length so long words never overflow
  // the max-w-md card. break-all + w-full handle any remaining edge cases.
  const wordLen = word.length;
  const wordSizeClass =
    wordLen <= 9  ? "text-3xl tracking-widest" :
    wordLen <= 14 ? "text-2xl tracking-wider"  :
    wordLen <= 20 ? "text-xl  tracking-wide"   :
                    "text-lg  tracking-normal";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-cloud relative">
      {win && <Confetti />}
      <div className={`rounded-[2rem] p-8 sm:p-10 w-full max-w-md text-center clay-soft animate-bounce-in ${win ? "bg-[hsl(var(--accent))]" : "bg-white/90"}`}>
        <div className="text-8xl mb-4 inline-block animate-wobble">
          {win ? "🏆" : "💀"}
        </div>
        <h2 className="text-5xl mb-2 text-shadow-pop" style={{ color: win ? "hsl(var(--primary-deep))" : "hsl(var(--destructive))" }}>
          {win ? "YOU WIN!" : "GAME OVER"}
        </h2>
        <p className="text-foreground/80 font-bold mb-2">
          {win ? "You squished all 5 levels!" : "The word was"}
        </p>
        {!win && (
          <p
            className={`font-mono uppercase ${wordSizeClass} mb-2 break-all w-full min-w-0 text-[hsl(var(--primary))]`}
            style={{ textShadow: "0 3px 0 hsl(var(--primary-deep) / 0.5)" }}
          >
            {word}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <button onClick={onRetry} className="clay-btn bg-[hsl(var(--primary))] text-white flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
          <button onClick={onMenu} className="clay-btn bg-white text-foreground flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Menu
          </button>
        </div>
      </div>
    </main>
  );
};

export default Index;