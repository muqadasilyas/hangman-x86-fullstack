; hangman_lib.asm  -  Pure logic library, NO Irvine32, NO console I/O
; Assemble:  ml /c /coff hangman_lib.asm
; Static lib: lib /out:hangman_lib.lib hangman_lib.obj

.386
.model flat, C
.stack 4096

PUBLIC HG_SelectWord
PUBLIC HG_Reset
PUBLIC HG_GetHiddenWord
PUBLIC HG_GetWordLength
PUBLIC HG_GetLives
PUBLIC HG_GuessLetter
PUBLIC HG_GetHint
PUBLIC HG_CheckWin
PUBLIC HG_IsGameOver
PUBLIC HG_SeedRandom
PUBLIC HG_GetState
PUBLIC HG_SetLives
PUBLIC HG_GetFullWord

; -------------------------------------------------------
; DATA
; -------------------------------------------------------
.data

bus1  byte "income",0
bus2  byte "salary",0
bus3  byte "profit",0
bus4  byte "finance",0
bus5  byte "stakeholder",0
bus6  byte "entrepreneurship",0
bus7  byte "investment",0
bus8  byte "strategy",0
bus9  byte "marketing",0
bus10 byte "innovation",0
bus11 byte "startup",0
bus12 byte "revenue",0
bus13 byte "budget",0
bus14 byte "employee",0
bus15 byte "meeting",0

tech1  byte "cybersecurity",0
tech2  byte "database",0
tech3  byte "program",0
tech4  byte "robotics",0
tech5  byte "datascience",0
tech6  byte "encryption",0
tech7  byte "computervision",0
tech8  byte "blockchain",0
tech9  byte "automation",0
tech10 byte "deeplearning",0
tech11 byte "generativeai",0
tech12 byte "agenticai",0
tech13 byte "artificialintelligence",0
tech14 byte "cloudcomputing",0
tech15 byte "machinelearning",0

prog1  byte "assembly",0
prog2  byte "pointer",0
prog3  byte "stack",0
prog4  byte "object",0
prog5  byte "encapsulation",0
prog6  byte "recursion",0
prog7  byte "polymorphism",0
prog8  byte "function",0
prog9  byte "constructor",0
prog10 byte "multithreading",0
prog11 byte "syntax",0
prog12 byte "abstraction",0
prog13 byte "linkedlist",0
prog14 byte "linearsearch",0
prog15 byte "bubblesort",0

net1  byte "protocol",0
net2  byte "networkaddress",0
net3  byte "router",0
net4  byte "multiplexing",0
net5  byte "firewall",0
net6  byte "subnetting",0
net7  byte "switch",0
net8  byte "configuration",0
net9  byte "defaultgateway",0
net10 byte "packet",0
net11 byte "server",0
net12 byte "staticrouting",0
net13 byte "ipaddress",0
net14 byte "bustopology",0
net15 byte "startopology",0

elec1  byte "transformer",0
elec2  byte "capacitor",0
elec3  byte "battery",0
elec4  byte "transistor",0
elec5  byte "oscilloscope",0
elec6  byte "rectifier",0
elec7  byte "breadboard",0
elec8  byte "multimeter",0
elec9  byte "microcontroller",0
elec10 byte "voltage",0
elec11 byte "current",0
elec12 byte "arduino",0
elec13 byte "circuit",0
elec14 byte "frequency",0
elec15 byte "semiconductor",0

soft1  byte "debug",0
soft2  byte "deployment",0
soft3  byte "architecture",0
soft4  byte "scalability",0
soft5  byte "multithreading",0
soft6  byte "documentation",0
soft7  byte "modularity",0
soft8  byte "reusability",0
soft9  byte "testing",0
soft10 byte "integration",0
soft11 byte "requirementengineering",0
soft12 byte "requirementspecification",0
soft13 byte "agilemethod",0
soft14 byte "waterfallmodel",0
soft15 byte "performance",0


; -------------------------------------------------------
; Word tables: 15 entries each
; -------------------------------------------------------
busWords  DWORD offset bus1, offset bus2, offset bus3, offset bus4, offset bus5,   \
                offset bus6, offset bus7, offset bus8, offset bus9, offset bus10,   \
                offset bus11,offset bus12,offset bus13,offset bus14,offset bus15
 
techWords DWORD offset tech1,offset tech2,offset tech3,offset tech4,offset tech5,  \
                offset tech6,offset tech7,offset tech8,offset tech9,offset tech10,  \
                offset tech11,offset tech12,offset tech13,offset tech14,offset tech15
 
progWords DWORD offset prog1,offset prog2,offset prog3,offset prog4,offset prog5,  \
                offset prog6,offset prog7,offset prog8,offset prog9,offset prog10,  \
                offset prog11,offset prog12,offset prog13,offset prog14,offset prog15
 
netWords  DWORD offset net1, offset net2, offset net3, offset net4, offset net5,   \
                offset net6, offset net7, offset net8, offset net9, offset net10,   \
                offset net11,offset net12,offset net13,offset net14,offset net15
 
elecWords DWORD offset elec1,offset elec2,offset elec3,offset elec4,offset elec5,  \
                offset elec6,offset elec7,offset elec8,offset elec9,offset elec10,  \
                offset elec11,offset elec12,offset elec13,offset elec14,offset elec15
 
softWords DWORD offset soft1,offset soft2,offset soft3,offset soft4,offset soft5,  \
                offset soft6,offset soft7,offset soft8,offset soft9,offset soft10,  \
                offset soft11,offset soft12,offset soft13,offset soft14,offset soft15
 
; index 0 unused; themes 1-6
themeTable DWORD 0, offset busWords, offset techWords, offset progWords, \
                    offset netWords, offset elecWords, offset softWords
 
selectedWord DWORD 0
hiddenWord   BYTE  32 DUP(0)
wordLength   DWORD 0
lives        DWORD 0
randSeed     DWORD 12345
 
; Change this constant if you add more words later
WORDS_PER_THEME EQU 15
 
; -------------------------------------------------------
; CODE
; -------------------------------------------------------
.code
 
; -------------------------------------------------------
; Internal: RandRange
;   ECX = range in. EAX = 0..(range-1) out.
; -------------------------------------------------------
RandRange PROC
    cmp  ecx, 0
    je   @rr_zero
 
    mov  eax, randSeed
    imul eax, 1664525
    add  eax, 1013904223
    and  eax, 7FFFFFFFh
    mov  randSeed, eax
 
    xor  edx, edx
    div  ecx
    mov  eax, edx
    ret
@rr_zero:
    xor  eax, eax
    ret
RandRange ENDP
 
; -------------------------------------------------------
; Internal: MyStrLen  (ESI = ptr, length returned in ECX)
; -------------------------------------------------------
MyStrLen PROC
    xor  ecx, ecx
@sl_loop:
    mov  al, [esi+ecx]
    cmp  al, 0
    je   @sl_done
    inc  ecx
    jmp  @sl_loop
@sl_done:
    ret
MyStrLen ENDP
 
; -------------------------------------------------------
; HG_SeedRandom(int seed)
; -------------------------------------------------------
HG_SeedRandom PROC C seed:DWORD
    mov  eax, seed
    mov  randSeed, eax
    ret
HG_SeedRandom ENDP
 
; -------------------------------------------------------
; HG_SelectWord(int theme, int wordIndex)
;   theme     : 1-6
;   wordIndex : 0..(WORDS_PER_THEME-1), or -1 for random
;   Returns 1 on success, 0 on bad args
; -------------------------------------------------------
HG_SelectWord PROC C theme:DWORD, wordIndex:DWORD
    mov  eax, theme
    cmp  eax, 1
    jl   @sw_bad
    cmp  eax, 6
    jg   @sw_bad
 
    mov  ecx, eax
    mov  esi, themeTable[ecx*4]
    cmp  esi, 0
    je   @sw_bad
 
    mov  eax, wordIndex
    cmp  eax, -1
    jne  @sw_useIdx
 
    ; pick random index 0..(WORDS_PER_THEME-1)
    mov  ecx, WORDS_PER_THEME
    call RandRange
 
@sw_useIdx:
    cmp  eax, 0
    jl   @sw_bad
    cmp  eax, WORDS_PER_THEME-1   ; valid range 0..14
    jg   @sw_bad
 
    mov  ecx, eax
    mov  eax, [esi + ecx*4]
    cmp  eax, 0
    je   @sw_bad
    mov  selectedWord, eax
 
    ; zero hiddenWord buffer
    push edi
    mov  edi, offset hiddenWord
    mov  ecx, 32
    xor  al,  al
    rep  stosb
    pop  edi
 
    mov  esi, selectedWord
    call MyStrLen           ; ECX = length
 
    cmp  ecx, 31
    jle  @sw_lenok
    mov  ecx, 31
@sw_lenok:
    mov  wordLength, ecx
 
    mov  edi, offset hiddenWord
    xor  eax, eax
@sw_build:
    cmp  eax, ecx
    jge  @sw_built
    mov  byte ptr [edi+eax], '_'
    inc  eax
    jmp  @sw_build
@sw_built:
    mov  byte ptr [edi+eax], 0
    mov  eax, 1
    ret
 
@sw_bad:
    xor  eax, eax
    ret
HG_SelectWord ENDP
 
; -------------------------------------------------------
; HG_Reset(int level)
;   1-2 = easy (8 lives), 3 = medium (6), 4-5 = hard (4)
; -------------------------------------------------------
HG_Reset PROC C level:DWORD
    mov  eax, level
    cmp  eax, 1
    je   @easy
    cmp  eax, 2
    je   @easy
    cmp  eax, 3
    je   @medium
    cmp  eax, 4
    je   @hard
    cmp  eax, 5
    je   @hard
@medium:
    mov  lives, 6
    ret
@easy:
    mov  lives, 8
    ret
@hard:
    mov  lives, 4
    ret
HG_Reset ENDP
 
; -------------------------------------------------------
; HG_GetHiddenWord(char* buf, int bufLen)
; -------------------------------------------------------
HG_GetHiddenWord PROC C buf:DWORD, bufLen:DWORD
    push ebx
    push esi
    push edi
 
    mov  edi, buf
    cmp  edi, 0
    je   @ghw_bad
 
    mov  ecx, bufLen
    cmp  ecx, 1
    jl   @ghw_bad
 
    dec  ecx
    mov  esi, offset hiddenWord
    xor  eax, eax
@ghw_loop:
    cmp  eax, ecx
    jge  @ghw_done
    mov  bl, [esi+eax]
    cmp  bl, 0
    je   @ghw_done
    mov  [edi+eax], bl
    inc  eax
    jmp  @ghw_loop
@ghw_done:
    mov  byte ptr [edi+eax], 0
    mov  eax, wordLength
    pop  edi
    pop  esi
    pop  ebx
    ret
@ghw_bad:
    xor  eax, eax
    pop  edi
    pop  esi
    pop  ebx
    ret
HG_GetHiddenWord ENDP
 
; -------------------------------------------------------
; HG_GetWordLength()
; -------------------------------------------------------
HG_GetWordLength PROC C
    mov eax, wordLength
    ret
HG_GetWordLength ENDP
 
; -------------------------------------------------------
; HG_GetLives()
; -------------------------------------------------------
HG_GetLives PROC C
    mov eax, lives
    ret
HG_GetLives ENDP
 
; -------------------------------------------------------
; HG_GuessLetter(int ch)
;   Returns: 1=correct, 0=wrong (life lost), -1=already revealed
;
;   Manual frame: do NOT use PROC C ch:DWORD here.
;   With extra push ebx/esi/edi inside the body, MASM's
;   auto-generated [ebp+8] would be wrong. We set up the
;   frame ourselves: push ebp first, then callee-saves.
; -------------------------------------------------------
HG_GuessLetter PROC C
 
    push ebp
    mov  ebp, esp
    push ebx
    push esi
    push edi
 
    ; [ebp+8] = first cdecl arg (ch as DWORD)
    movzx ebx, byte ptr [ebp+8]
    or    bl, 20h           ; force lowercase
 
    cmp  selectedWord, 0
    je   @gl_wrong
 
    mov  esi, selectedWord
    mov  edi, offset hiddenWord
 
    xor  ecx, ecx           ; hidden positions matching ch
    xor  edx, edx           ; total occurrences in word
 
@gl_scan:
    mov  al, [esi]
    cmp  al, 0
    je   @gl_done_scan
 
    mov  ah, al
    or   ah, 20h
 
    cmp  ah, bl
    jne  @gl_next
 
    inc  edx
 
    cmp  byte ptr [edi], '_'
    jne  @gl_next
    inc  ecx
 
@gl_next:
    inc  esi
    inc  edi
    jmp  @gl_scan
 
@gl_done_scan:
    cmp  edx, 0
    je   @gl_wrong
 
    cmp  ecx, 0
    je   @gl_already
 
    mov  esi, selectedWord
    mov  edi, offset hiddenWord
 
@gl_reveal:
    mov  al, [esi]
    cmp  al, 0
    je   @gl_ok
 
    mov  ah, al
    or   ah, 20h
 
    cmp  ah, bl
    jne  @gl_rnext
 
    mov  al, [esi]
    mov  [edi], al
 
@gl_rnext:
    inc  esi
    inc  edi
    jmp  @gl_reveal
 
@gl_ok:
    mov  eax, 1
    jmp  @gl_exit
 
@gl_already:
    mov  eax, -1
    jmp  @gl_exit
 
@gl_wrong:
    cmp  lives, 0
    je   @gl_skip_dec
    dec  lives
@gl_skip_dec:
    xor  eax, eax
 
@gl_exit:
    pop  edi
    pop  esi
    pop  ebx
    pop  ebp
    ret
 
HG_GuessLetter ENDP
 
; -------------------------------------------------------
; HG_GetHint()
;   Reveals the FIRST still-hidden letter. Costs 1 life.
;   Returns revealed char, or 0 if word is already complete.
; -------------------------------------------------------
HG_GetHint PROC C
 
    push ebx
    push esi
    push edi
 
    mov  esi, selectedWord
    cmp  esi, 0
    je   @hint_none
 
    mov  edi, offset hiddenWord
 
@hint_scan:
    mov  al, [edi]
    cmp  al, 0
    je   @hint_none
 
    cmp  al, '_'
    je   @hint_found
 
    inc  esi
    inc  edi
    jmp  @hint_scan
 
@hint_found:
    mov  al, [esi]
    mov  [edi], al
 
    cmp  lives, 0
    je   @hint_skip
    dec  lives
@hint_skip:
    movzx eax, al
 
    pop  edi
    pop  esi
    pop  ebx
    ret
 
@hint_none:
    xor  eax, eax
    pop  edi
    pop  esi
    pop  ebx
    ret
 
HG_GetHint ENDP
 
; -------------------------------------------------------
; HG_CheckWin()
; -------------------------------------------------------
HG_CheckWin PROC C
    mov  esi, offset hiddenWord
@cw_loop:
    mov  al, [esi]
    cmp  al, 0
    je   @cw_won
    cmp  al, '_'
    je   @cw_not
    inc  esi
    jmp  @cw_loop
@cw_won:
    mov  eax, 1
    ret
@cw_not:
    xor  eax, eax
    ret
HG_CheckWin ENDP
 
; -------------------------------------------------------
; HG_IsGameOver()
; -------------------------------------------------------
HG_IsGameOver PROC C
    cmp  lives, 0
    je   @go_over
    xor  eax, eax
    ret
@go_over:
    mov  eax, 1
    ret
HG_IsGameOver ENDP
 
; -------------------------------------------------------
; HG_GetState(char* buf, int bufLen,
;             int* livesOut, int* winOut, int* gameOverOut)
; -------------------------------------------------------
HG_GetState PROC C buf:DWORD, bufLen:DWORD, livesOut:DWORD, winOut:DWORD, gameOverOut:DWORD
    push edi
 
    push bufLen
    push buf
    call HG_GetHiddenWord
    add  esp, 8
 
    mov  edi, livesOut
    cmp  edi, 0
    je   @gs_skip_lives
    mov  eax, lives
    mov  [edi], eax
@gs_skip_lives:
 
    call HG_CheckWin
    mov  edi, winOut
    cmp  edi, 0
    je   @gs_skip_win
    mov  [edi], eax
@gs_skip_win:
 
    call HG_IsGameOver
    mov  edi, gameOverOut
    cmp  edi, 0
    je   @gs_done
    mov  [edi], eax
 
@gs_done:
    mov  eax, 1
    pop  edi
    ret
HG_GetState ENDP
 
; -------------------------------------------------------
; HG_SetLives(int val)
; -------------------------------------------------------
HG_SetLives PROC C val:DWORD
    mov  eax, val
    mov  lives, eax
    ret
HG_SetLives ENDP
 
; -------------------------------------------------------
; HG_GetFullWord(char* buf, int bufLen)
;   Copies the real answer into buf (used on game over).
;   Returns length on success, 0 on failure.
; -------------------------------------------------------
HG_GetFullWord PROC C buf:DWORD, bufLen:DWORD
    push ebx
    push esi
    push edi
 
    mov  edi, buf
    cmp  edi, 0
    je   @gfw_bad
 
    mov  ecx, bufLen
    cmp  ecx, 1
    jl   @gfw_bad
 
    dec  ecx
    mov  esi, selectedWord
    cmp  esi, 0
    je   @gfw_bad
 
    xor  eax, eax
@gfw_loop:
    cmp  eax, ecx
    jge  @gfw_done
    mov  bl, [esi+eax]
    cmp  bl, 0
    je   @gfw_done
    mov  [edi+eax], bl
    inc  eax
    jmp  @gfw_loop
 
@gfw_done:
    mov  byte ptr [edi+eax], 0
    pop  edi
    pop  esi
    pop  ebx
    ret
 
@gfw_bad:
    xor  eax, eax
    pop  edi
    pop  esi
    pop  ebx
    ret
 
HG_GetFullWord ENDP
 
END