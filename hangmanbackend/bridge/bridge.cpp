#include <iostream>
#include <fstream>
#include <sstream>
#include <cstring>
#include <string>
#include <cctype>
#include <ctime>
#include <cstdint>
#include <vector>
#include <map>
#include <algorithm>

using namespace std;

// ---------------- ASM FUNCTIONS ----------------
extern "C" {
void __cdecl HG_SeedRandom(int seed);
int  __cdecl HG_SelectWord(int theme, int wordIndex);
int  __cdecl HG_Reset(int level);
int  __cdecl HG_GetHiddenWord(char* buf, int len);
int  __cdecl HG_GetFullWord(char* buf, int len);
int  __cdecl HG_GetLives();
int  __cdecl HG_GuessLetter(int ch);
int  __cdecl HG_CheckWin();
int  __cdecl HG_IsGameOver();
int  __cdecl HG_GetHint();
int  __cdecl HG_SetLives(int val);
}

// Keep in sync with WORDS_PER_THEME in hangman_lib.asm
static const int WORDS_PER_THEME = 15;
static const int NUM_THEMES      = 6;

// ---------------- STATE FILE ----------------
const char* STATE_FILE  = "state.txt";
const char* SHUFFLE_FILE = "shuffle.txt";

void saveState(int theme, int index, int level,
               const string& correct, const string& wrong) {
    ofstream f(STATE_FILE);
    f << theme << " " << index << " " << level << "\n"
      << correct << "\n"
      << wrong   << "\n";
}

bool loadState(int& theme, int& index, int& level,
               string& correct, string& wrong) {
    ifstream f(STATE_FILE);
    if (!f.is_open()) return false;
    f >> theme >> index >> level;
    f.ignore();
    getline(f, correct);
    getline(f, wrong);
    return true;
}

// ---------------- SHUFFLE QUEUES ----------------
// Stored as a map: theme number (1-6) -> vector of remaining indices.
// File format: one line per theme, space-separated indices.
//   Line 1 = theme 1, Line 2 = theme 2, ..., Line 6 = theme 6.

typedef map<int, vector<int> > QueueMap;

void loadQueues(QueueMap& queues) {
    ifstream f(SHUFFLE_FILE);
    for (int t = 1; t <= NUM_THEMES; t++) {
        queues[t].clear();
        string line;
        if (f.is_open() && getline(f, line)) {
            istringstream ss(line);
            int v;
            while (ss >> v)
                queues[t].push_back(v);
        }
        // Empty or missing line: leave queue empty; nextIndex() will fill it.
    }
}

void saveQueues(const QueueMap& queues) {
    ofstream f(SHUFFLE_FILE);
    for (int t = 1; t <= NUM_THEMES; t++) {
        // Write the queue for this theme as space-separated numbers on one line
        const vector<int>& q = queues.at(t);
        for (int i = 0; i < (int)q.size(); i++) {
            if (i > 0) f << " ";
            f << q[i];
        }
        f << "\n";
    }
}

// Fisher-Yates shuffle of indices 0..WORDS_PER_THEME-1
void buildDeck(vector<int>& deck) {
    deck.resize(WORDS_PER_THEME);
    for (int i = 0; i < WORDS_PER_THEME; i++) deck[i] = i;
    for (int i = WORDS_PER_THEME - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
}

// Pop the next index for a theme. Refills the deck when exhausted.
int nextIndex(QueueMap& queues, int theme) {
    vector<int>& q = queues[theme];
    if (q.empty()) buildDeck(q);
    int idx = q.back();
    q.pop_back();
    return idx;
}

// ---------------- FULL WORD HELPER ----------------
// Uses the proper ASM export HG_GetFullWord to retrieve the real answer.
// Falls back gracefully if the ASM export is not linked (returns empty string).
void getFullWord(char* buf, int len) {
    HG_GetFullWord(buf, len);
}

// ---------------- JSON ----------------
void printJSON(const char* word, int lives, const char* status,
               char lastGuess, int level, int theme) {
    cout << "{"
         << "\"word\":\""      << word      << "\","
         << "\"lives\":"       << lives     << ","
         << "\"status\":\""    << status    << "\","
         << "\"lastGuess\":\"" << lastGuess << "\","
         << "\"level\":"       << level     << ","
         << "\"theme\":"       << theme
         << "}";
}

// ---------------- REBUILD ASM STATE ----------------
void rebuildASM(int theme, int index, int level,
                const string& correct, const string& wrong) {
    HG_SelectWord(theme, index);
    HG_Reset(level);
    for (int i = 0; i < (int)correct.size(); i++)
        HG_GuessLetter((int)(unsigned char)correct[i]);
    int startLives = HG_GetLives();
    int remaining  = startLives - (int)wrong.size();
    if (remaining < 0) remaining = 0;
    HG_SetLives(remaining);
}

// ---------------- MAIN ----------------
int main(int argc, char* argv[]) {

    if (argc < 2) {
        cout << "{\"error\":\"no command\"}";
        return 0;
    }

    // ================= START =================
    if (strcmp(argv[1], "start") == 0) {

        int theme = (argc >= 3) ? atoi(argv[2]) : 1;
        int level = (argc >= 4) ? atoi(argv[3]) : 1;

        if (theme < 1 || theme > NUM_THEMES) {
            cout << "{\"error\":\"invalid theme\"}";
            return 0;
        }

        // Strong seed: mix time(), clock(), and a stack-address nibble.
        // Stack address (ASLR) changes each run, breaking same-second ties
        // on Windows where clock() is 0 at process start.
        volatile unsigned int stack_var = 0xDEADBEEF;
        unsigned int ptr_bits = (unsigned int)((uintptr_t)(&stack_var) & 0xFFFFFFFFu);
        unsigned int seed = ((unsigned int)time(0)  * 1664525u)
                          ^ ((unsigned int)clock()  * 22695477u)
                          ^ ptr_bits;
        srand(seed);
        HG_SeedRandom((int)seed);

        // Shuffle-without-repeat: load per-theme queues, pop next index
        QueueMap queues;
        loadQueues(queues);
        int index = nextIndex(queues, theme);
        saveQueues(queues);   // persist before anything can fail below

        int result = HG_SelectWord(theme, index);
        if (!result) {
            cout << "{\"error\":\"invalid theme or index\"}";
            return 0;
        }
        HG_Reset(level);

        saveState(theme, index, level, "", "");

        char word[64];
        HG_GetHiddenWord(word, 64);

        printJSON(word, HG_GetLives(), "playing", '-', level, theme);
        return 0;
    }

    // ================= GUESS =================
    if (strcmp(argv[1], "guess") == 0) {

        if (argc < 3) {
            cout << "{\"error\":\"missing letter\"}";
            return 0;
        }

        char ch = (char)tolower((unsigned char)argv[2][0]);

        int theme, index, level;
        string correct, wrong;

        if (!loadState(theme, index, level, correct, wrong)) {
            cout << "{\"error\":\"no active game\"}";
            return 0;
        }

        rebuildASM(theme, index, level, correct, wrong);

        // Already guessed — return current state unchanged
        if (correct.find(ch) != string::npos ||
            wrong.find(ch)   != string::npos) {
            char word[64];
            HG_GetHiddenWord(word, 64);
            const char* status = HG_IsGameOver() ? "lost" :
                                 HG_CheckWin()   ? "won"  : "playing";
            printJSON(word, HG_GetLives(), status, ch, level, theme);
            return 0;
        }

        int result = HG_GuessLetter((int)(unsigned char)ch);

        if (result == 1) correct += ch;
        else             wrong   += ch;

        saveState(theme, index, level, correct, wrong);

        char word[64];
        const char* status = HG_IsGameOver() ? "lost" :
                             HG_CheckWin()   ? "won"  : "playing";

        if (HG_IsGameOver()) getFullWord(word, 64);
        else                 HG_GetHiddenWord(word, 64);

        printJSON(word, HG_GetLives(), status, ch, level, theme);
        return 0;
    }

    // ================= HINT =================
    if (strcmp(argv[1], "hint") == 0) {

        int theme, index, level;
        string correct, wrong;

        if (!loadState(theme, index, level, correct, wrong)) {
            cout << "{\"error\":\"no active game\"}";
            return 0;
        }

        rebuildASM(theme, index, level, correct, wrong);

        int hintVal = HG_GetHint();
        char hintCh = (char)hintVal;

        if (hintCh != 0) {
            if (correct.find(hintCh) == string::npos)
                correct += hintCh;
            wrong += '*';   // life-cost marker, not a real letter
        }

        saveState(theme, index, level, correct, wrong);

        char word[64];
        const char* status = HG_IsGameOver() ? "lost" :
                             HG_CheckWin()   ? "won"  : "playing";

        if (HG_IsGameOver()) getFullWord(word, 64);
        else                 HG_GetHiddenWord(word, 64);

        printJSON(word, HG_GetLives(), status,
                  hintCh ? hintCh : '-', level, theme);
        return 0;
    }

    // ================= STATE =================
    if (strcmp(argv[1], "state") == 0) {

        int theme, index, level;
        string correct, wrong;

        if (!loadState(theme, index, level, correct, wrong)) {
            cout << "{\"error\":\"no active game\"}";
            return 0;
        }

        rebuildASM(theme, index, level, correct, wrong);

        char word[64];
        const char* status = HG_IsGameOver() ? "lost" :
                             HG_CheckWin()   ? "won"  : "playing";

        if (HG_IsGameOver()) getFullWord(word, 64);
        else                 HG_GetHiddenWord(word, 64);

        printJSON(word, HG_GetLives(), status, '-', level, theme);
        return 0;
    }

    cout << "{\"error\":\"unknown command\"}";
    return 0;
}