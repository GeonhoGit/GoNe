const PLAYERS = {
  south: { id: "south", label: "아래", short: "아", next: "north" },
  north: { id: "north", label: "위", short: "위", next: "south" },
};

const TURN_SECONDS = 30;
const PIECE_MOVE_MS = 600;
const CAPTURE_FADE_MS = 280;
const CAPTURE_ANIMATION_START_MS = PIECE_MOVE_MS + 80;
const CAPTURE_GHOST_CLEAR_MS = CAPTURE_ANIMATION_START_MS + CAPTURE_FADE_MS + 80;
const PLAYER_NAMES_KEY = "gonuLocalPlayerNames";
const AI_PLAYER = "north";
const HUMAN_PLAYER = "south";
const AI_THINK_MS = 520;
const CAREER_PROGRESS_KEY = "gonuCareerProgress";
const CAREER_PROGRESS_VERSION = 2;
const CAREER_DIFFICULTY_ORDER = ["easy", "normal", "hard"];
const CAREER_EXCLUDED_MAP_IDS = new Set(["well"]);
const AI_DIFFICULTIES = {
  easy: { label: "쉬움", depth: 1, mistakeRate: 0.4, candidateLimit: 8 },
  normal: { label: "보통", depth: 2, mistakeRate: 0.15, candidateLimit: 10 },
  hard: { label: "어려움", depth: 4, mistakeRate: 0.03, candidateLimit: 12 },
};
const AI_MAP_DIFFICULTY_OVERRIDES = {
  easy: {
    well: { mistakeRate: 0.85 },
  },
  normal: {
    well: { mistakeRate: 0.75 },
  },
  hard: {
    well: { mistakeRate: 0.65 },
  },
};
const KING_GONU_JUMP_LIMIT = 3;
const KING_GONU_FIRST_PLAYER = "north";
const KING_GONU_CONFIG = {
  size: 5,
  kingPlayer: "north",
  soldierPlayer: "south",
  kingStart: "king-base",
  // Photo start: soldiers fill the top/bottom two rows; the middle row stays empty.
  soldierStarts: [
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
    [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
    [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
  ],
};

const dom = {
  homeScreen: document.querySelector("#homeScreen"),
  singleModeButton: document.querySelector("#singleModeButton"),
  careerModeButton: document.querySelector("#careerModeButton"),
  onlineModeButton: document.querySelector("#onlineModeButton"),
  difficultyPanel: document.querySelector("#difficultyPanel"),
  difficultyButtons: document.querySelectorAll(".difficulty-button"),
  modeLabel: document.querySelector("#modeLabel"),
  homeButton: document.querySelector("#homeButton"),
  playerBlock: document.querySelector("#swapSeatsButton")?.closest(".info-block"),
  mapList: document.querySelector("#mapList"),
  mapCount: document.querySelector("#mapCount"),
  boardSvg: document.querySelector("#boardSvg"),
  resetButton: document.querySelector("#resetButton"),
  flipButton: document.querySelector("#flipButton"),
  swapSeatsButton: document.querySelector("#swapSeatsButton"),
  southNameInput: document.querySelector("#southNameInput"),
  northNameInput: document.querySelector("#northNameInput"),
  southNameLabel: document.querySelector("#southNameLabel"),
  northNameLabel: document.querySelector("#northNameLabel"),
  turnLabel: document.querySelector("#turnLabel"),
  turnHint: document.querySelector("#turnHint"),
  turnCount: document.querySelector("#turnCount"),
  timerLabel: document.querySelector("#timerLabel"),
  kingJumpButton: document.querySelector("#kingJumpButton"),
  resultBanner: document.querySelector("#resultBanner"),
  mapTitle: document.querySelector("#mapTitle"),
  mapDescription: document.querySelector("#mapDescription"),
  videoLink: document.querySelector("#videoLink"),
  ruleList: document.querySelector("#ruleList"),
  moveLog: document.querySelector("#moveLog"),
  southPieces: document.querySelector("#southPieces"),
  northPieces: document.querySelector("#northPieces"),
};

const maps = [
  createWellMap(),
  createHobakMap(),
  createWheelMap(),
  createSurroundMap(),
  createChamMap(),
  createKingMap(),
  createGridMap({
    id: "grid4",
    name: "넉줄고누",
    size: 4,
    maxTurns: 50,
    category: "초·중급",
    capture: "sandwich",
    videoUrl: "https://youtu.be/hUaePCFoWeg?si=S9WoVZBY_XfVVOsU",
    description: "4x4 격자판에서 각자 4개씩 첫 줄에 놓고 한 칸씩 움직이며, 샌드위치로 상대 말을 따내는 고누입니다.",
  }),
  createGridMap({
    id: "grid6",
    name: "여섯줄고누",
    size: 6,
    maxTurns: 70,
    category: "중·고급",
    capture: "sandwich",
    movement: "slideOrthogonal",
    videoUrl: "https://youtu.be/hYlXXUW-3T4?si=rpEx8xPWY9pMpyE0",
    description: "6x6 격자판에서 각자 6개씩 첫 줄에 놓고 여러 칸을 움직이며, 샌드위치로 상대 말을 따내는 고누입니다.",
  }),
  createGridMap({
    id: "grid8",
    name: "팔팔고누",
    size: 8,
    maxTurns: 100,
    category: "최고급",
    capture: "sandwich",
    movement: "slideOrthogonal",
    initialOrientation: "sides",
    videoUrl: "https://www.youtube.com/watch?v=L8A59cA56pU",
    description: "8x8 격자판에서 각자 8개씩 첫 줄에 놓고 여러 칸을 움직이며, 샌드위치로 상대 말을 따내는 대형 고누입니다.",
  }),
];

let state = null;
let activeMapId = maps[0].id;
let timerId = null;
let aiTimerId = null;
let flipped = false;
let playerNames = loadPlayerNames();
let appMode = "local";
let aiDifficulty = "normal";
let careerProgress = loadCareerProgress();

function createWellMap() {
  const nodes = [
    node("n", 50, 15, "위"),
    node("e", 82, 50, "오른쪽"),
    node("c", 50, 50, "우물"),
    node("s", 50, 85, "아래"),
    node("w", 18, 50, "왼쪽"),
  ];

  return {
    id: "well",
    name: "우물고누",
    category: "초급",
    maxTurns: 40,
    nodes,
    edges: [
      ["w", "n"],
      ["n", "e"],
      ["e", "s"],
      ["n", "c"],
      ["e", "c"],
      ["s", "c"],
      ["w", "c"],
    ],
    visualEdges: [
      { from: "w", to: "n", curve: [22, 16] },
      { from: "n", to: "e", curve: [78, 16] },
      { from: "e", to: "s", curve: [86, 74] },
      { from: "n", to: "c" },
      { from: "e", to: "c" },
      { from: "s", to: "c" },
      { from: "w", to: "c" },
    ],
    initial: {
      north: ["n", "w"],
      south: ["s", "e"],
    },
    ruleSet: "blockade",
    allowBacktrack: true,
    firstMoveCenterBan: true,
    firstMoveCenterBlockedFrom: {
      north: ["w"],
      south: ["s"],
    },
    videoUrl: "https://www.youtube.com/watch?v=_SSAB78kE5I",
    description: "가장 작은 판에서 빠르게 길을 막는 입문용 고누입니다.",
    rules: [
      "선을 따라 빈 교차점으로 한 칸 이동합니다.",
      "상대 말 2개가 모두 움직일 수 없으면 승리합니다.",
      "첫 수에만 바로 외통수가 되는 시작 말의 중앙 진입이 금지됩니다.",
      "첫 수 이후에는 중앙이 비어 있으면 누구나 중앙으로 이동할 수 있습니다.",
    ],
  };
}

function createHobakMap() {
  const nodes = [
    node("lt", 14, 20, "왼쪽 위"),
    node("lm", 14, 50, "왼쪽 가운데"),
    node("lb", 14, 80, "왼쪽 아래"),
    node("cl", 27, 50, "광장 왼쪽"),
    node("ct", 50, 28, "광장 위"),
    node("cc", 50, 50, "광장 중앙"),
    node("cb", 50, 72, "광장 아래"),
    node("cr", 73, 50, "광장 오른쪽"),
    node("rt", 86, 20, "오른쪽 위"),
    node("rm", 86, 50, "오른쪽 가운데"),
    node("rb", 86, 80, "오른쪽 아래"),
  ];

  return {
    id: "hobak",
    name: "호박고누",
    category: "중급",
    maxTurns: 40,
    nodes,
    edges: [
      ["lt", "lm"], ["lm", "lb"],
      ["rt", "rm"], ["rm", "rb"],
      ["lm", "cl"], ["cl", "cc"], ["cc", "cr"], ["cr", "rm"],
      ["ct", "cc"], ["cc", "cb"],
      ["cl", "ct"], ["ct", "cr"], ["cr", "cb"], ["cb", "cl"],
    ],
    visualEdges: [
      { from: "lt", to: "lm" },
      { from: "lm", to: "lb" },
      { from: "rt", to: "rm" },
      { from: "rm", to: "rb" },
      { from: "lm", to: "cl" },
      { from: "cl", to: "cc" },
      { from: "cc", to: "cr" },
      { from: "cr", to: "rm" },
      { from: "ct", to: "cc" },
      { from: "cc", to: "cb" },
      { from: "cl", to: "ct", curve: [32, 30] },
      { from: "ct", to: "cr", curve: [68, 30] },
      { from: "cr", to: "cb", curve: [68, 70] },
      { from: "cb", to: "cl", curve: [32, 70] },
    ],
    initial: {
      north: ["rt", "rm", "rb"],
      south: ["lt", "lm", "lb"],
    },
    homeZones: {
      north: ["rt", "rm", "rb"],
      south: ["lt", "lm", "lb"],
    },
    ruleSet: "homeBlockade",
    videoUrl: "https://www.youtube.com/watch?v=OHQfHw9hmBY",
    description: "좌우 집에서 나와 가운데 원형 광장에서 길을 막는 호박고누입니다.",
    rules: [
      "선을 따라 빈 교차점으로 한 칸 이동합니다.",
      "자기 집을 나온 말은 다시 자기 집으로 들어갈 수 없습니다.",
      "상대 집에는 들어갈 수 없습니다.",
      "상대 말 3개가 모두 움직일 수 없으면 승리합니다.",
    ],
  };
}

function createWheelMap() {
  const gridIds = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, col) => `g-${row}-${col}`)
  );
  const gridPoint = (row, col, label) => node(gridIds[row][col], 25 + col * (50 / 3), 25 + row * (50 / 3), label);
  const wheelOuterArcPath = (cx, cy, r, corner, reverse = false) => {
    const points = {
      right: [cx + r, cy],
      bottom: [cx, cy + r],
      left: [cx - r, cy],
      top: [cx, cy - r],
    };
    const arcs = {
      tl: [points.right, points.bottom],
      tr: [points.bottom, points.left],
      br: [points.left, points.top],
      bl: [points.top, points.right],
    };
    const [startPoint, endPoint] = arcs[corner];
    const start = reverse ? endPoint : startPoint;
    const end = reverse ? startPoint : endPoint;
    const sweep = reverse ? 1 : 0;
    return `M ${start[0]} ${start[1]} A ${r} ${r} 0 1 ${sweep} ${end[0]} ${end[1]}`;
  };
  const nodes = [];
  const edges = [];
  const visualEdges = [];

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      nodes.push(gridPoint(row, col, `${row + 1}행 ${col + 1}열`));
      if (col > 0) edges.push([gridIds[row][col - 1], gridIds[row][col]]);
      if (row > 0) edges.push([gridIds[row - 1][col], gridIds[row][col]]);
    }
  }

  for (const [from, to] of edges) {
    visualEdges.push({ from, to });
  }

  const wheelPaths = [
    {
      from: gridIds[0][1],
      to: gridIds[1][0],
      path: wheelOuterArcPath(25, 25, 16.67, "tl"),
      reversePath: wheelOuterArcPath(25, 25, 16.67, "tl", true),
    },
    {
      from: gridIds[1][3],
      to: gridIds[0][2],
      path: wheelOuterArcPath(75, 25, 16.67, "tr"),
      reversePath: wheelOuterArcPath(75, 25, 16.67, "tr", true),
    },
    {
      from: gridIds[3][2],
      to: gridIds[2][3],
      path: wheelOuterArcPath(75, 75, 16.67, "br"),
      reversePath: wheelOuterArcPath(75, 75, 16.67, "br", true),
    },
    {
      from: gridIds[2][0],
      to: gridIds[3][1],
      path: wheelOuterArcPath(25, 75, 16.67, "bl"),
      reversePath: wheelOuterArcPath(25, 75, 16.67, "bl", true),
    },
  ];
  const wheelTracks = wheelPaths.map((item) => [item.from, item.to]);
  const wheelVisuals = wheelPaths.map((item) => ({ from: item.from, to: item.to, path: item.path }));
  const wheelEdges = wheelTracks.flatMap((track) =>
    track.slice(1).map((to, index) => [track[index], to])
  );

  edges.push(...wheelEdges);
  visualEdges.push(...wheelVisuals);

  return {
    id: "wheel",
    name: "바퀴고누",
    category: "중급",
    maxTurns: 60,
    nodes,
    edges,
    visualEdges,
    wheelTracks,
    wheelEdges,
    wheelPaths,
    initial: {
      north: [gridIds[0][2], gridIds[0][3], gridIds[1][2], gridIds[1][3]],
      south: [gridIds[2][0], gridIds[2][1], gridIds[3][0], gridIds[3][1]],
    },
    ruleSet: "wheelCapture",
    movement: "wheel",
    videoUrl: "https://youtu.be/UcIspN8Vzj0?si=mkTwJWiCY617NLu6",
    description: "4x4 격자판 네 모서리에 바퀴 궤도가 붙은 고누입니다.",
    rules: [
      "격자판에서는 선을 따라 상하좌우 한 칸 이동합니다.",
      "상대 말을 잡으려면 반드시 둥근 바퀴를 돌아야 합니다.",
      "바퀴를 돌아 나오면 직선상으로 여러 칸을 이동할 수 있습니다.",
      "바퀴를 돌아 나온 직선상에 상대 말이 있으면 그 말을 따낼 수 있습니다.",
      "상대 말을 따내면 바퀴에서 나온 직선 방향으로 한 칸 더 이동합니다.",
      "바퀴를 돌아 나온 직선상에 자기 말이 있으면 더 전진하지 못하고 멈춥니다.",
      "상대 말을 모두 따내면 승리합니다.",
    ],
  };
}

function createSurroundMap() {
  const nodes = [
    node("lt", 36, 17, "왼쪽 위"),
    node("lo1", 16, 36, "왼쪽 바깥 위"),
    node("lo2", 14, 50, "왼쪽 바깥 가운데"),
    node("lo3", 16, 64, "왼쪽 바깥 아래"),
    node("li", 29, 50, "왼쪽 안쪽"),
    node("lb", 36, 83, "왼쪽 아래"),
    node("t0", 50, 15, "위 꼭짓점"),
    node("t1", 50, 27, "위 반원"),
    node("u", 50, 39, "중앙 위"),
    node("cl", 38, 50, "중앙 왼쪽"),
    node("c", 50, 50, "중앙"),
    node("cr", 62, 50, "중앙 오른쪽"),
    node("d", 50, 62, "중앙 아래"),
    node("b1", 50, 74, "아래 반원"),
    node("b0", 50, 86, "아래 꼭짓점"),
    node("rt", 64, 17, "오른쪽 위"),
    node("ro1", 84, 36, "오른쪽 바깥 위"),
    node("ri", 70, 50, "오른쪽 안쪽"),
    node("ro2", 86, 50, "오른쪽 바깥 가운데"),
    node("ro3", 84, 64, "오른쪽 바깥 아래"),
    node("rb", 64, 83, "오른쪽 아래"),
  ];

  const edges = [
    ["lt", "t0"], ["t0", "rt"], ["lt", "t1"], ["t1", "rt"],
    ["t0", "t1"], ["t1", "u"], ["u", "c"], ["c", "d"], ["d", "b1"], ["b1", "b0"],
    ["lb", "b0"], ["b0", "rb"], ["lb", "b1"], ["b1", "rb"],
    ["lo2", "li"], ["li", "cl"], ["cl", "c"], ["c", "cr"], ["cr", "ri"], ["ri", "ro2"],
    ["u", "cl"], ["cl", "d"], ["d", "cr"], ["cr", "u"],
    ["lt", "lo1"], ["lo1", "lo2"], ["lo2", "lo3"], ["lo3", "lb"],
    ["lo1", "li"], ["li", "lo3"],
    ["rt", "ro1"], ["ro1", "ro2"], ["ro2", "ro3"], ["ro3", "rb"],
  ];

  const visualEdges = [
    { from: "lt", to: "t0", curve: [42, 13] },
    { from: "t0", to: "rt", curve: [58, 13] },
    { from: "lt", to: "t1", curve: [41, 33] },
    { from: "t1", to: "rt", curve: [59, 33] },
    { from: "t0", to: "t1" },
    { from: "t1", to: "u" },
    { from: "u", to: "c" },
    { from: "c", to: "d" },
    { from: "d", to: "b1" },
    { from: "b1", to: "b0" },
    { from: "lb", to: "b0", curve: [42, 89] },
    { from: "b0", to: "rb", curve: [58, 89] },
    { from: "lb", to: "b1", curve: [41, 68] },
    { from: "b1", to: "rb", curve: [59, 68] },
    { from: "lo2", to: "li" },
    { from: "li", to: "cl" },
    { from: "cl", to: "c" },
    { from: "c", to: "cr" },
    { from: "cr", to: "ri" },
    { from: "ri", to: "ro2" },
    { from: "u", to: "cl", curve: [39, 39] },
    { from: "cl", to: "d", curve: [39, 61] },
    { from: "d", to: "cr", curve: [61, 61] },
    { from: "cr", to: "u", curve: [61, 39] },
    { from: "lt", to: "lo1", curve: [20, 18] },
    { from: "lo1", to: "lo2", curve: [12, 43] },
    { from: "lo2", to: "lo3", curve: [12, 57] },
    { from: "lo3", to: "lb", curve: [20, 82] },
    { from: "lo1", to: "li", curve: [28, 38] },
    { from: "li", to: "lo3", curve: [28, 62] },
    { from: "rt", to: "ro1", curve: [80, 18] },
    { from: "ro1", to: "ro2", curve: [88, 43] },
    { from: "ro2", to: "ro3", curve: [88, 57] },
    { from: "ro3", to: "rb", curve: [80, 82] },
  ];

  return {
    id: "surround",
    name: "포위고누",
    category: "상급",
    maxTurns: 80,
    nodes,
    edges,
    visualEdges,
    initial: {
      north: ["rt", "ro1", "ri", "ro2", "ro3", "rb"],
      south: ["lt", "lo1", "lo2", "lo3", "li", "lb"],
    },
    ruleSet: "surroundCapture",
    allowBacktrack: true,
    captureLimit: 1,
    videoUrl: "https://youtu.be/F4taOFSQHOw?si=NKXh9gEaIzUZu9d8",
    description: "사진처럼 좌우 진영과 중앙 원이 이어진 판에서 상대 말을 완전히 막아 따내는 고누입니다.",
    rules: [
      "선을 따라 연결된 빈 교차점으로 한 칸 이동합니다.",
      "내 이동으로 상대 말의 모든 이동길을 내 말로 막으면 그 말을 1개 따냅니다.",
      "상대 자기편 말 때문에 막힌 길은 포위로 보지 않습니다.",
      "한 번에 따낼 수 있는 말은 1개로 처리합니다.",
      "상대 말이 2개 이하가 되면 승리합니다.",
    ],
  };
}

function createChamMap() {
  const squareNodes = (prefix, low, high) => ([
    node(`${prefix}-tl`, low, low, `${prefix} 왼쪽 위`),
    node(`${prefix}-tm`, 50, low, `${prefix} 위 가운데`),
    node(`${prefix}-tr`, high, low, `${prefix} 오른쪽 위`),
    node(`${prefix}-rm`, high, 50, `${prefix} 오른쪽 가운데`),
    node(`${prefix}-br`, high, high, `${prefix} 오른쪽 아래`),
    node(`${prefix}-bm`, 50, high, `${prefix} 아래 가운데`),
    node(`${prefix}-bl`, low, high, `${prefix} 왼쪽 아래`),
    node(`${prefix}-lm`, low, 50, `${prefix} 왼쪽 가운데`),
  ]);
  const ringEdges = (prefix) => ([
    [`${prefix}-tl`, `${prefix}-tm`],
    [`${prefix}-tm`, `${prefix}-tr`],
    [`${prefix}-tr`, `${prefix}-rm`],
    [`${prefix}-rm`, `${prefix}-br`],
    [`${prefix}-br`, `${prefix}-bm`],
    [`${prefix}-bm`, `${prefix}-bl`],
    [`${prefix}-bl`, `${prefix}-lm`],
    [`${prefix}-lm`, `${prefix}-tl`],
  ]);

  const nodes = [
    ...squareNodes("o", 14, 86),
    ...squareNodes("m", 27, 73),
    ...squareNodes("i", 40, 60),
  ];
  const edges = [
    ...ringEdges("o"),
    ...ringEdges("m"),
    ...ringEdges("i"),
    ["o-tm", "m-tm"], ["m-tm", "i-tm"],
    ["o-rm", "m-rm"], ["m-rm", "i-rm"],
    ["o-bm", "m-bm"], ["m-bm", "i-bm"],
    ["o-lm", "m-lm"], ["m-lm", "i-lm"],
  ];
  const millLines = [
    ...["o", "m", "i"].flatMap((prefix) => ([
      [`${prefix}-tl`, `${prefix}-tm`, `${prefix}-tr`],
      [`${prefix}-tr`, `${prefix}-rm`, `${prefix}-br`],
      [`${prefix}-br`, `${prefix}-bm`, `${prefix}-bl`],
      [`${prefix}-bl`, `${prefix}-lm`, `${prefix}-tl`],
    ])),
    ["o-tm", "m-tm", "i-tm"],
    ["o-rm", "m-rm", "i-rm"],
    ["o-bm", "m-bm", "i-bm"],
    ["o-lm", "m-lm", "i-lm"],
  ];

  return {
    id: "cham",
    name: "참고누",
    category: "고급",
    maxTurns: 120,
    nodes,
    edges,
    visualEdges: edges.map(([from, to]) => ({ from, to })),
    initial: {
      north: [],
      south: [],
    },
    ruleSet: "chamGonu",
    reservePieces: 12,
    allowBacktrack: true,
    millLines,
    videoUrl: "https://youtu.be/9tHxsFYi61U?si=GzUWP--tDMg2xct0",
    description: "빈 3중 사각형 판에 말을 놓고, 3개 한 줄을 만들면 상대 말을 하나 따내는 고누입니다.",
    rules: [
      "처음에는 빈 교차점에 각자 12개 말을 번갈아 하나씩 놓습니다.",
      "자기 말 3개가 한 선에 놓이면 상대 말 하나를 선택해 따냅니다.",
      "모든 말을 놓은 뒤에는 선으로 연결된 빈 교차점으로 한 칸 이동합니다.",
      "이동해서 다시 3개 한 줄을 만들면 상대 말 하나를 따냅니다.",
      "상대의 남은 말이 2개 이하가 되거나 상대가 움직일 수 없으면 승리합니다.",
    ],
  };
}

function createKingMap() {
  const { size, kingStart } = KING_GONU_CONFIG;
  const kingBase = "king-base";
  const gridIds = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => `king-${row}-${col}`)
  );
  const xAt = (col) => 16 + col * 15.5;
  const yAt = (row) => 20 + row * 15;
  const nodes = [];
  const edges = [];
  const visualEdges = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      nodes.push(node(gridIds[row][col], xAt(col), yAt(row), `${row + 1}행 ${col + 1}열`));
      if (col > 0) edges.push([gridIds[row][col - 1], gridIds[row][col]]);
      if (row > 0) edges.push([gridIds[row - 1][col], gridIds[row][col]]);
    }
  }

  for (const [from, to] of edges) {
    visualEdges.push({ from, to });
  }

  nodes.push(node(kingBase, 90, 50, "왕 진영"));
  edges.push([gridIds[2][4], kingBase]);
  visualEdges.push({ from: gridIds[2][4], to: kingBase });
  visualEdges.push({
    path: `M ${xAt(4)} 50 L 96 41 L 96 59 Z`,
    className: "king-camp",
  });

  const openingKingTargets = [...gridIds[2]];
  const movePaths = openingKingTargets.map((targetNode) => {
    const target = nodes.find((item) => item.id === targetNode);
    return {
      from: kingBase,
      to: targetNode,
      path: `M 90 50 L ${xAt(4)} 50 L ${target.x} ${target.y}`,
    };
  });
  const kingStartNode = kingStart === kingBase
    ? kingBase
    : gridIds[kingStart[0]]?.[kingStart[1]] || gridIds[Math.floor(size / 2)][Math.floor(size / 2)];
  const soldiers = getValidatedKingSoldierStarts(gridIds, kingStartNode);
  const kingLines = [
    ...Array.from({ length: size }, (_, row) => [...gridIds[row]]),
    ...Array.from({ length: size }, (_, col) =>
      Array.from({ length: size }, (_, row) => gridIds[row][col])
    ),
  ];

  return {
    id: "king",
    name: "왕고누",
    category: "비대칭",
    maxTurns: 80,
    nodes,
    edges,
    visualEdges,
    movePaths,
    initial: {
      north: [kingStartNode],
      south: soldiers,
    },
    ruleSet: "kingHunt",
    movement: "kingGonu",
    startPlayer: KING_GONU_FIRST_PLAYER,
    allowBacktrack: true,
    kingPlayer: KING_GONU_CONFIG.kingPlayer,
    soldierPlayer: KING_GONU_CONFIG.soldierPlayer,
    kingLines,
    kingJumps: KING_GONU_JUMP_LIMIT,
    kingBaseNode: kingBase,
    openingKingTargets,
    kingBoardNodes: gridIds.flat(),
    centerLineNodes: gridIds[2],
    videoUrl: "https://www.youtube.com/watch?v=Iwlim_85xs0",
    description: "왕 1개와 졸 20개가 겨루는 비대칭 고누입니다.",
    rules: [
      "왕은 가로 또는 세로 한 방향으로, 막는 말이 없으면 여러 칸 이동할 수 있습니다.",
      `왕은 점프를 ${KING_GONU_JUMP_LIMIT}회 사용할 수 있고 빈 위치 어디든 이동할 수 있습니다.`,
      "왕이 이동한 직후 좌우 또는 상하에 졸이 붙어 있으면 해당 졸 2개를 제거합니다.",
      "졸은 가로 또는 세로로 연결된 빈 교차점으로 한 칸만 이동합니다.",
      "졸이 모두 제거되면 왕이 승리하고, 왕의 일반 이동과 점프가 모두 막히면 졸이 승리합니다.",
    ],
  };
}

function getValidatedKingSoldierStarts(gridIds, kingStartNode) {
  const validNodes = new Set(gridIds.flat());
  const seen = new Set();
  return KING_GONU_CONFIG.soldierStarts
    .map(([row, col]) => gridIds[row]?.[col])
    .filter((nodeId) => nodeId && validNodes.has(nodeId) && nodeId !== kingStartNode)
    .filter((nodeId) => {
      if (seen.has(nodeId)) return false;
      seen.add(nodeId);
      return true;
    });
}

function createGridMap(config) {
  const { id, name, size, maxTurns, capture, movement, initialOrientation, videoUrl, description, category } = config;
  const margin = size >= 8 ? 9 : 12;
  const span = 100 - margin * 2;
  const nodes = [];
  const edges = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const nodeId = `${row}-${col}`;
      nodes.push(node(nodeId, margin + (span * col) / (size - 1), margin + (span * row) / (size - 1)));
      if (col > 0) edges.push([`${row}-${col - 1}`, nodeId]);
      if (row > 0) edges.push([`${row - 1}-${col}`, nodeId]);
    }
  }

  return {
    id,
    name,
    category: category || (capture ? "상급" : size === 4 ? "초급" : "중급"),
    maxTurns,
    nodes,
    edges,
    initial: initialOrientation === "sides"
      ? {
          north: Array.from({ length: size }, (_, row) => `${row}-${size - 1}`),
          south: Array.from({ length: size }, (_, row) => `${row}-0`),
        }
      : {
          north: Array.from({ length: size }, (_, col) => `0-${col}`),
          south: Array.from({ length: size }, (_, col) => `${size - 1}-${col}`),
        },
    ruleSet: capture ? "sandwichGrid" : "blockade",
    movement: movement || "step",
    gridSize: size,
    capture,
    videoUrl,
    description,
    rules: capture
      ? [
          movement === "slideOrthogonal"
            ? "선을 따라 전후좌우 한 방향으로, 막는 말이 없으면 여러 칸 이동할 수 있습니다."
            : "선을 따라 상하좌우 빈 교차점으로 한 칸 이동합니다.",
          "이동 후 내 말 2개가 상대 말 1개를 가로 또는 세로로 감싸면 따냅니다.",
          "상대 말이 1개 이하가 되거나 모두 움직일 수 없으면 승리합니다.",
        ]
      : [
          movement === "slideOrthogonal"
            ? "선을 따라 상하좌우 한 방향으로, 막는 말이 없으면 여러 칸 이동할 수 있습니다."
            : "선을 따라 상하좌우 빈 교차점으로 한 칸 이동합니다.",
          "상대 말이 모두 움직일 수 없으면 승리합니다.",
        ],
  };
}

function node(id, x, y, label = String(id)) {
  return { id: String(id), x, y, label };
}

function buildInitialState(map) {
  const pieces = [];
  for (const player of ["south", "north"]) {
    map.initial[player].forEach((nodeId, index) => {
      pieces.push({
        id: `${player}-${index + 1}`,
        player,
        node: String(nodeId),
        alive: true,
        leftHome: false,
        previousNode: null,
      });
    });
  }

  const nextState = {
    map,
    pieces,
    currentPlayer: map.startPlayer || "south",
    selectedPieceId: null,
    legalMoves: [],
    moveNumber: 1,
    result: null,
    log: [`${map.name} 시작`],
    signatures: new Map(),
    secondsLeft: TURN_SECONDS,
    timeoutStreak: { south: 0, north: 0 },
    lastMove: null,
    kingJumpsLeft: map.ruleSet === "kingHunt" ? map.kingJumps : 0,
    kingJumpMode: false,
    capturedGhosts: [],
    captureGhostToken: 0,
    placedCounts: {
      south: map.initial.south.length,
      north: map.initial.north.length,
    },
    pendingCapture: null,
    mode: appMode,
    aiDifficulty,
    aiThinking: false,
    careerProgressRecorded: false,
  };

  registerSignature(nextState);
  return nextState;
}

function renderMapList() {
  const displayMaps = appMode === "career" ? getCareerMaps() : maps;
  if (appMode === "career") {
    const unlockedCount = displayMaps.filter((map) => isCareerMapUnlocked(map.id)).length;
    dom.mapCount.textContent = `${unlockedCount}/${displayMaps.length} 해금`;
  } else {
    dom.mapCount.textContent = `${displayMaps.length}종`;
  }
  dom.mapList.innerHTML = "";

  for (const map of displayMaps) {
    const locked = appMode === "career" && !isCareerMapUnlocked(map.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-card${map.id === activeMapId ? " active" : ""}${locked ? " locked" : ""}`;
    button.disabled = locked;
    button.dataset.map = map.id;
    const pieceSummary = map.ruleSet === "kingHunt"
      ? `왕 ${map.initial.north.length} · 졸 ${map.initial.south.length}`
      : map.ruleSet === "chamGonu"
        ? `말 ${map.reservePieces}개씩`
        : `말 ${map.initial.south.length}개씩`;
    button.innerHTML = locked
      ? `<strong>${map.name}</strong><span>잠김 · 앞 맵 먼저 클리어</span>`
      : `<strong>${map.name}</strong><span>${map.category} · ${pieceSummary}</span>`;
    button.addEventListener("click", () => {
      if (locked) return;
      activeMapId = map.id;
      startGame(map.id);
    });
    dom.mapList.appendChild(button);
  }
}

function startGame(mapId = activeMapId) {
  clearAiTimer();
  const map = maps.find((item) => item.id === mapId) || maps[0];
  activeMapId = map.id;
  state = buildInitialState(map);
  render();
  restartTimer();
  scheduleAiTurn();
}

function render() {
  syncPlayerForm();
  recordCareerResult();
  renderDifficultyButtons();
  renderMapList();
  renderInfo();
  renderBoard();
}

function loadPlayerNames() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PLAYER_NAMES_KEY));
    return {
      south: saved?.south || "아래 플레이어",
      north: saved?.north || "위 플레이어",
    };
  } catch {
    return {
      south: "아래 플레이어",
      north: "위 플레이어",
    };
  }
}

function savePlayerNames() {
  window.localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(playerNames));
}

function loadCareerProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CAREER_PROGRESS_KEY));
    const source = saved?.version === CAREER_PROGRESS_VERSION ? saved.cleared : saved;
    return CAREER_DIFFICULTY_ORDER.reduce((progress, difficulty) => {
      const savedIndex = source?.[difficulty];
      progress[difficulty] = saved?.version === CAREER_PROGRESS_VERSION
        ? normalizeCareerIndex(savedIndex)
        : normalizeLegacyCareerIndex(savedIndex);
      return progress;
    }, {});
  } catch {
    return CAREER_DIFFICULTY_ORDER.reduce((progress, difficulty) => {
      progress[difficulty] = -1;
      return progress;
    }, {});
  }
}

function saveCareerProgress() {
  window.localStorage.setItem(CAREER_PROGRESS_KEY, JSON.stringify({
    version: CAREER_PROGRESS_VERSION,
    cleared: careerProgress,
  }));
}

function normalizeCareerIndex(value) {
  const index = Number(value);
  if (!Number.isFinite(index)) return -1;
  return Math.max(-1, Math.min(getCareerMaps().length - 1, Math.floor(index)));
}

function normalizeLegacyCareerIndex(value) {
  const index = Number(value);
  if (!Number.isFinite(index)) return -1;
  return normalizeCareerIndex(Math.floor(index) - 1);
}

function getMapIndex(mapId) {
  return getCareerMaps().findIndex((map) => map.id === mapId);
}

function getCareerMaps() {
  return maps.filter((map) => !CAREER_EXCLUDED_MAP_IDS.has(map.id));
}

function getCareerClearedIndex(difficulty = aiDifficulty) {
  return normalizeCareerIndex(careerProgress[difficulty]);
}

function isCareerDifficultyUnlocked(difficulty) {
  const orderIndex = CAREER_DIFFICULTY_ORDER.indexOf(difficulty);
  if (orderIndex <= 0) return true;

  const previousDifficulty = CAREER_DIFFICULTY_ORDER[orderIndex - 1];
  return getCareerClearedIndex(previousDifficulty) >= getCareerMaps().length - 1;
}

function getCareerUnlockedMapLimit(difficulty = aiDifficulty) {
  if (!isCareerDifficultyUnlocked(difficulty)) return -1;
  return Math.min(getCareerClearedIndex(difficulty) + 1, getCareerMaps().length - 1);
}

function isCareerMapUnlocked(mapId, difficulty = aiDifficulty) {
  const mapIndex = getMapIndex(mapId);
  return mapIndex >= 0 && mapIndex <= getCareerUnlockedMapLimit(difficulty);
}

function getCareerStartMapId(difficulty = aiDifficulty, preferredMapId = activeMapId) {
  if (isCareerMapUnlocked(preferredMapId, difficulty)) return preferredMapId;
  return getCareerMaps()[0]?.id || maps[0].id;
}

function recordCareerResult() {
  if (appMode !== "career" || !state?.result || state.careerProgressRecorded) return;

  state.careerProgressRecorded = true;
  if (state.result.winner !== HUMAN_PLAYER) return;

  const mapIndex = getMapIndex(state.map.id);
  if (mapIndex < 0 || mapIndex > getCareerUnlockedMapLimit(aiDifficulty)) return;

  const previous = getCareerClearedIndex(aiDifficulty);
  if (mapIndex <= previous) return;

  careerProgress[aiDifficulty] = mapIndex;
  saveCareerProgress();
}

function renderDifficultyButtons() {
  dom.difficultyButtons.forEach((button) => {
    const difficulty = button.dataset.difficulty || "easy";
    const unlocked = isCareerDifficultyUnlocked(difficulty);
    const label = AI_DIFFICULTIES[difficulty].label;

    button.disabled = !unlocked;
    button.classList.toggle("locked", !unlocked);
    button.textContent = unlocked ? label : `${label} 잠김`;
  });
}

function updatePlayerName(player, value) {
  playerNames[player] = value.trim() || PLAYERS[player].label;
  savePlayerNames();
  renderInfo();
  renderBoard();
}

function syncPlayerForm() {
  if (dom.southNameInput.value !== playerNames.south) {
    dom.southNameInput.value = playerNames.south;
  }
  if (dom.northNameInput.value !== playerNames.north) {
    dom.northNameInput.value = playerNames.north;
  }
}

function getPlayerName(player) {
  if (appMode === "career" && player === HUMAN_PLAYER) {
    return "플레이어";
  }
  if (isAiMode() && player === AI_PLAYER) {
    return `AI ${AI_DIFFICULTIES[aiDifficulty].label}`;
  }
  return playerNames[player] || PLAYERS[player].label;
}

function getPieceShort(player) {
  const name = getPlayerName(player).trim();
  return name ? name.slice(0, 1) : PLAYERS[player].short;
}

function getModeLabel() {
  if (appMode === "single") return `싱글 · ${AI_DIFFICULTIES[aiDifficulty].label}`;
  if (appMode === "career") return `커리어 · ${AI_DIFFICULTIES[aiDifficulty].label}`;
  if (appMode === "online") return "온라인 · 로컬";
  return "로컬 2인";
}

function renderInfo() {
  const { map } = state;
  const southAlive = getAlivePieces("south").length;
  const northAlive = getAlivePieces("north").length;
  const isKingGonu = map.ruleSet === "kingHunt";
  const isChamGonu = map.ruleSet === "chamGonu";
  const turnName = isKingGonu
    ? state.currentPlayer === map.kingPlayer ? "왕 차례" : "졸 차례"
    : state.pendingCapture
      ? `${getPlayerName(state.pendingCapture.player)} 따낼 말 선택`
    : `${getPlayerName(state.currentPlayer)} (${PLAYERS[state.currentPlayer].label})`;

  dom.modeLabel.textContent = getModeLabel();
  dom.turnLabel.textContent = state.result ? "종료" : turnName;
  dom.turnHint.textContent = state.result
    ? "새 판을 누르면 같은 자리로 다시 시작합니다."
    : getTurnHintText(isKingGonu);
  dom.turnCount.textContent = `${state.moveNumber}/${map.maxTurns}`;
  dom.timerLabel.textContent = state.result
    ? "정지"
    : appMode === "career"
      ? "제한 없음"
      : `${state.secondsLeft}s`;
  dom.southNameLabel.textContent = getPlayerName("south");
  dom.northNameLabel.textContent = getPlayerName("north");
  dom.southPieces.textContent = isKingGonu
    ? `${southAlive}개 · 잡힘 ${map.initial.south.length - southAlive}개`
    : isChamGonu
      ? `${southAlive}개 · 남은 ${getChamReserveLeft("south")}개`
      : `${southAlive}개`;
  dom.northPieces.textContent = isKingGonu
    ? `점프 ${state.kingJumpsLeft}회`
    : isChamGonu
      ? `${northAlive}개 · 남은 ${getChamReserveLeft("north")}개`
      : `${northAlive}개`;
  dom.mapTitle.textContent = map.name;
  dom.mapDescription.textContent = map.description;
  dom.playerBlock?.classList.toggle("hidden", appMode === "career");
  renderKingJumpControl(isKingGonu);
  if (map.videoUrl) {
    dom.videoLink.href = map.videoUrl;
    dom.videoLink.classList.remove("hidden");
  } else {
    dom.videoLink.classList.add("hidden");
  }

  dom.ruleList.innerHTML = "";
  getDisplayRules(map).forEach((rule) => {
    const li = document.createElement("li");
    li.textContent = rule;
    dom.ruleList.appendChild(li);
  });

  dom.moveLog.innerHTML = "";
  state.log.slice(-12).reverse().forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    dom.moveLog.appendChild(li);
  });

  if (state.result) {
    dom.resultBanner.textContent = "";
    dom.resultBanner.classList.toggle("centered", shouldShowRetryButton());

    const message = document.createElement("div");
    message.className = "result-message";
    message.textContent = getDisplayResultMessage();
    dom.resultBanner.appendChild(message);

    if (shouldShowRetryButton()) {
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "primary-button retry-button";
      retryButton.textContent = "다시하기";
      retryButton.addEventListener("click", () => startGame(activeMapId));
      dom.resultBanner.appendChild(retryButton);
    }

    dom.resultBanner.classList.remove("hidden");
  } else {
    dom.resultBanner.classList.remove("centered");
    dom.resultBanner.classList.add("hidden");
  }
}

function shouldShowRetryButton() {
  if (!state?.result) return false;
  if (!state.result.winner) return true;
  return appMode === "career" && state.result.winner !== HUMAN_PLAYER;
}

function getDisplayResultMessage() {
  if (!state?.result) return "";
  if (appMode === "career" && state.result.winner === AI_PLAYER) {
    return state.result.message.replaceAll("상대", "플레이어");
  }
  return state.result.message;
}

function getTurnHintText(isKingGonu) {
  if (isAiTurn()) {
    return `${getPlayerName(getTurnActor())} 생각 중입니다.`;
  }

  if (state.pendingCapture) {
    return "3개 한 줄을 만들었습니다. 따낼 상대 말을 선택하세요.";
  }

  if (state.map.ruleSet === "chamGonu") {
    return isChamPlacementTurn()
      ? `${getPlayerName(state.currentPlayer)}가 빈 교차점에 말을 놓으세요.`
      : `${getPlayerName(state.currentPlayer)}가 말을 선택해 연결된 빈 교차점으로 한 칸 이동하세요.`;
  }

  if (!isKingGonu) {
    return `${getPlayerName(state.currentPlayer)}가 말을 선택하세요. 한 수를 두면 자동으로 상대 차례가 됩니다.`;
  }

  if (state.kingJumpMode) {
    return "왕 점프 모드입니다. 빈 위치를 선택하세요.";
  }

  return state.currentPlayer === state.map.kingPlayer
    ? "왕을 선택하세요. 직선 이동하거나 왕 점프를 사용할 수 있습니다."
    : "졸 하나를 선택하세요. 상하좌우 한 칸만 이동합니다.";
}

function renderKingJumpControl(isKingGonu) {
  if (!dom.kingJumpButton) return;

  const canShow = isKingGonu && state.currentPlayer === state.map.kingPlayer && !state.result;
  dom.kingJumpButton.classList.toggle("hidden", !canShow);
  dom.kingJumpButton.classList.toggle("active", Boolean(state.kingJumpMode));
  dom.kingJumpButton.disabled = !canShow || state.kingJumpsLeft <= 0;
  dom.kingJumpButton.textContent = state.kingJumpMode
    ? `점프 선택 중 · ${state.kingJumpsLeft}회`
    : `왕 점프 ${state.kingJumpsLeft}회`;
}

function getDisplayRules(map) {
  const commonRules = [
    "공통: 같은 말 배치가 3회 나오면 무승부입니다.",
    appMode === "career"
      ? "커리어: 시간 제한과 시간 초과 패널티가 없습니다."
      : "공통: 한 턴은 30초이며 2회 연속 시간 초과 시 패배합니다.",
  ];

  if (!map.allowBacktrack) {
    commonRules.unshift("공통: 직전 위치로 바로 되돌아갈 수 없습니다.");
  }

  return [
    ...map.rules,
    ...getWinConditionRules(map),
    ...commonRules,
  ];
}

function getWinConditionRules(map) {
  if (map.ruleSet === "kingHunt") {
    return [
      "승리 방법: 왕은 졸을 모두 제거하면 이깁니다.",
      "승리 방법: 졸은 왕의 일반 이동과 점프를 모두 막으면 이깁니다.",
    ];
  }

  if (map.ruleSet === "chamGonu") {
    return ["승리 방법: 상대 말이 2개 이하가 되거나 상대가 움직일 수 없게 만들면 이깁니다."];
  }

  if (map.ruleSet === "surroundCapture") {
    return ["승리 방법: 상대 말을 2개 이하로 줄이거나 상대가 움직일 수 없게 만들면 이깁니다."];
  }

  if (map.ruleSet === "wheelCapture") {
    return ["승리 방법: 바퀴를 돌아 상대 말을 모두 따내면 이깁니다."];
  }

  if (map.ruleSet === "sandwichGrid") {
    return ["승리 방법: 상대 말을 1개 이하로 줄이거나 상대가 움직일 수 없게 만들면 이깁니다."];
  }

  return ["승리 방법: 상대 말을 모두 움직일 수 없게 만들면 이깁니다."];
}

function renderBoard() {
  const svg = dom.boardSvg;
  svg.classList.toggle("flipped", flipped);
  svg.classList.toggle("well-board", state.map.id === "well");
  svg.classList.toggle("hobak-board", state.map.id === "hobak");
  svg.classList.toggle("wheel-board", state.map.id === "wheel");
  svg.classList.toggle("surround-board", state.map.id === "surround");
  svg.classList.toggle("cham-board", state.map.id === "cham");
  svg.classList.toggle("king-board", state.map.id === "king");
  svg.classList.toggle("grid-board", Boolean(state.map.gridSize));
  svg.classList.toggle("palpal-board", state.map.id === "grid8");
  dom.flipButton.classList.toggle("active", flipped);
  svg.innerHTML = "";

  const visualEdges = state.map.visualEdges || state.map.edges.map(([from, to]) => ({ from, to }));
  for (const edge of visualEdges) {
    const pathData = getEdgePath(edge);
    if (!pathData) continue;

    svg.appendChild(createSvg("path", {
      class: `edge${edge.className ? ` ${edge.className}` : ""}`,
      d: pathData,
      fill: "none",
    }));
  }

  const selected = getSelectedPiece();
  const validSet = new Set(state.legalMoves.map((move) => move.to));
  if (isChamPlacementTurn()) {
    state.map.nodes
      .filter((item) => !getPieceAt(item.id))
      .forEach((item) => validSet.add(item.id));
  }
  const capturableSet = new Set((state.lastMove ? [] : getCapturablePieces()).map((piece) => piece.id));
  if (!state.lastMove) {
    state.legalMoves
      .filter((move) => move.capturePieceId)
      .forEach((move) => capturableSet.add(move.capturePieceId));
  }

  for (const item of state.map.nodes) {
    const classes = ["node"];
    if (state.map.centerLineNodes?.includes(item.id)) classes.push("king-center");
    if (validSet.has(item.id)) classes.push("valid");
    if (selected?.node === item.id) classes.push("selected");

    const circle = createSvg("circle", {
      class: classes.join(" "),
      cx: item.x,
      cy: item.y,
      r: getNodeRadius(),
      "data-node": item.id,
      "aria-label": item.label,
    });
    circle.addEventListener("click", () => handleNodeClick(item.id));
    svg.appendChild(circle);
  }

  for (const piece of state.pieces.filter((item) => item.alive)) {
    const pos = getNode(piece.node);
    const isSelected = piece.id === state.selectedPieceId;
    const isCapturable = capturableSet.has(piece.id);
    const pieceCircle = createSvg("circle", {
      class: `piece ${piece.player}${isSelected ? " selected" : ""}${isCapturable ? " capturable" : ""}`,
      cx: pos.x,
      cy: pos.y,
      r: getPieceRadius(),
      "data-piece": piece.id,
    });
    addPieceMoveAnimation(pieceCircle, piece);
    pieceCircle.addEventListener("click", (event) => {
      event.stopPropagation();
      handlePieceClick(piece.id);
    });
    svg.appendChild(pieceCircle);

  }

  for (const ghost of state.capturedGhosts || []) {
    const pos = getNode(ghost.node);
    if (!pos) continue;
    if (getPieceAt(ghost.node)) continue;

    const classes = ["piece", ghost.player, ghost.phase === "capturing" ? "captured" : "capture-waiting"];

    svg.appendChild(createSvg("circle", {
      class: classes.join(" "),
      cx: pos.x,
      cy: pos.y,
      r: getPieceRadius(),
    }));
  }
}

function addPieceMoveAnimation(pieceCircle, piece) {
  const lastMove = state.lastMove;
  if (!lastMove || lastMove.animated || lastMove.pieceId !== piece.id || lastMove.to !== piece.node) return;

  const from = getNode(lastMove.from);
  const to = getNode(lastMove.to);
  if (!from || !to) return;

  const dx = from.x - to.x;
  const dy = from.y - to.y;
  if (dx === 0 && dy === 0) return;

  lastMove.animated = true;

  const movePath = getMovePathForMove(lastMove.from, lastMove.to, from, to);
  if (!animatePieceAlongPath(pieceCircle, movePath, lastMove.from, from, to)) {
    animatePieceLinearly(pieceCircle, dx, dy);
  }

  window.setTimeout(() => {
    if (state?.lastMove === lastMove) {
      state.lastMove = null;
      if (state.pendingCapture) renderBoard();
    }
  }, PIECE_MOVE_MS + 60);
}

function animatePieceLinearly(pieceCircle, dx, dy) {
  pieceCircle.setAttribute("transform", `translate(${dx} ${dy})`);
  const startedAt = performance.now();

  const animate = (now) => {
    if (!pieceCircle.isConnected) return;

    const progress = getMoveProgress(startedAt, now);
    const eased = easeMove(progress);
    const x = dx * (1 - eased);
    const y = dy * (1 - eased);

    if (progress >= 1) {
      pieceCircle.removeAttribute("transform");
      return;
    }

    pieceCircle.setAttribute("transform", `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
    window.requestAnimationFrame(animate);
  };

  window.requestAnimationFrame(animate);
}

function animatePieceAlongPath(pieceCircle, movePath, fromNodeId, from, to) {
  if (!movePath?.path) return false;

  const path = createSvg("path", { d: movePath.path });
  let pathLength = 0;

  try {
    pathLength = path.getTotalLength();
  } catch (error) {
    return false;
  }

  if (!Number.isFinite(pathLength) || pathLength <= 0) return false;

  const reverse = String(movePath.from) !== String(fromNodeId);
  pieceCircle.setAttribute("cx", from.x);
  pieceCircle.setAttribute("cy", from.y);
  pieceCircle.removeAttribute("transform");

  const startedAt = performance.now();
  const animate = (now) => {
    if (!pieceCircle.isConnected) return;

    const progress = getMoveProgress(startedAt, now);
    const eased = easeMove(progress);
    const distance = (reverse ? 1 - eased : eased) * pathLength;
    const point = path.getPointAtLength(distance);

    if (progress >= 1) {
      pieceCircle.setAttribute("cx", to.x);
      pieceCircle.setAttribute("cy", to.y);
      return;
    }

    pieceCircle.setAttribute("cx", point.x.toFixed(3));
    pieceCircle.setAttribute("cy", point.y.toFixed(3));
    window.requestAnimationFrame(animate);
  };

  window.requestAnimationFrame(animate);
  return true;
}

function getMoveProgress(startedAt, now) {
  return Math.min((now - startedAt) / PIECE_MOVE_MS, 1);
}

function easeMove(progress) {
  return progress * progress * (3 - 2 * progress);
}

function getMovePathForMove(from, to, fromNode, toNode) {
  if (
    state.lastMove?.path &&
    state.lastMove.from === from &&
    state.lastMove.to === to
  ) {
    return { from, to, path: state.lastMove.path };
  }

  const targetKey = getEdgeKey(from, to);
  const customPath = (state.map.movePaths || []).find((item) => getEdgeKey(item.from, item.to) === targetKey);
  if (customPath) return customPath;

  const wheelPath = (state.map.wheelPaths || []).find((item) => getEdgeKey(item.from, item.to) === targetKey);
  if (wheelPath) return wheelPath;

  const visualEdge = (state.map.visualEdges || []).find((item) => (
    item.from && item.to && getEdgeKey(item.from, item.to) === targetKey
  ));
  if (visualEdge) {
    const path = getEdgePath(visualEdge);
    if (path) return { from: visualEdge.from, to: visualEdge.to, path };
  }

  return {
    from,
    to,
    path: `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`,
  };
}

function getEdgePath(edge) {
  if (edge.path) return edge.path;

  const from = getNode(edge.from);
  const to = getNode(edge.to);
  if (!from || !to) return "";

  if (edge.curve) {
    return `M ${from.x} ${from.y} Q ${edge.curve[0]} ${edge.curve[1]} ${to.x} ${to.y}`;
  }

  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function appendHomeZone(svg, ids) {
  const points = ids.map((id) => {
    const item = getNode(id);
    return `${item.x},${item.y}`;
  });
  svg.appendChild(createSvg("polygon", {
    class: "home-zone",
    points: points.join(" "),
  }));
}

function createSvg(tag, attrs) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function getNodeRadius() {
  if (state.map.gridSize >= 8) return 1.85;
  if (state.map.gridSize >= 6) return 2.25;
  return 2.75;
}

function getPieceRadius() {
  if (state.map.gridSize >= 8) return 3.1;
  if (state.map.gridSize >= 6) return 3.8;
  return 4.8;
}

function handlePieceClick(pieceId) {
  if (state.result) return;
  if (isAiTurn()) return;
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || !piece.alive) return;

  if (state.pendingCapture) {
    handlePendingCapture(piece);
    return;
  }

  if (isChamPlacementTurn()) return;
  if (piece.player !== state.currentPlayer) {
    const captureMove = state.legalMoves.find((move) => move.capturePieceId === piece.id);
    if (captureMove) applyMove(captureMove);
    return;
  }

  if (state.map.ruleSet === "kingHunt" && piece.player !== state.map.kingPlayer) {
    state.kingJumpMode = false;
  }

  state.selectedPieceId = pieceId;
  state.legalMoves = getLegalMoves(piece);
  render();
}

function handleNodeClick(nodeId) {
  if (state.result || state.pendingCapture) return;
  if (isAiTurn()) return;

  if (isChamPlacementTurn()) {
    placeChamPiece(nodeId);
    return;
  }

  if (!state.selectedPieceId) return;
  const move = state.legalMoves.find((item) => item.to === nodeId);
  if (!move) return;
  applyMove(move);
}

function toggleKingJumpMode() {
  if (isAiTurn()) return;

  if (
    state.map.ruleSet !== "kingHunt" ||
    state.result ||
    state.currentPlayer !== state.map.kingPlayer ||
    state.kingJumpsLeft <= 0
  ) {
    return;
  }

  state.kingJumpMode = !state.kingJumpMode;
  const king = getKingPiece();
  state.selectedPieceId = king?.id || null;
  state.legalMoves = king ? getLegalMoves(king) : [];
  render();
}

function applyMove(move, options = {}) {
  const piece = state.pieces.find((item) => item.id === move.pieceId);
  if (!piece || !piece.alive || state.result) return;

  if (state.map.ruleSet === "chamGonu") {
    applyChamMove(piece, move, options);
    return;
  }

  const from = piece.node;
  state.lastMove = {
    pieceId: piece.id,
    from,
    to: move.to,
    path: move.path || null,
    animated: false,
  };
  piece.node = move.to;
  piece.previousNode = from;
  updateHomeStatus(piece, from, move.to);
  applyKingJumpUse(move);

  const captured = resolveCaptures(piece, move, from);
  let captureGhostToken = null;
  if (captured.length) {
    state.capturedGhosts = captured.map((item) => ({
      id: item.id,
      player: item.player,
      node: item.node,
      phase: "waiting",
    }));
    state.captureGhostToken += 1;
    captureGhostToken = state.captureGhostToken;
  }
  const capturedText = captured.length ? `, ${captured.length}개 따냄` : "";
  const prefix = options.timeout ? `${getPlayerName(piece.player)} 시간 초과 자동 이동` : getMoveLogPlayerName(piece.player);
  state.log.push(`${prefix}: ${formatNode(from)} → ${formatNode(move.to)}${capturedText}`);

  if (!options.timeout) {
    state.timeoutStreak[piece.player] = 0;
  }

  state.selectedPieceId = null;
  state.legalMoves = [];
  state.kingJumpMode = false;
  state.moveNumber += 1;

  evaluateEnd(piece.player);
  if (!state.result) {
    switchTurn();
    registerSignature(state);
    evaluateStartOfTurn();
  }

  render();
  if (captureGhostToken) {
    playCaptureGhostsAfterMove(captureGhostToken);
  }
  restartTimer();
  scheduleAiTurn();
}

function applyKingJumpUse(move) {
  if (state.map.ruleSet !== "kingHunt" || !move.jump) return;
  state.kingJumpsLeft = Math.max(0, state.kingJumpsLeft - 1);
}

function placeChamPiece(nodeId, options = {}) {
  if (!isChamPlacementTurn() || getPieceAt(nodeId) || !getNodeMaybe(nodeId)) return;

  const player = state.currentPlayer;
  const pieceNumber = state.placedCounts[player] + 1;
  const piece = {
    id: `${player}-${pieceNumber}`,
    player,
    node: String(nodeId),
    alive: true,
    leftHome: false,
    previousNode: null,
  };

  state.pieces.push(piece);
  state.placedCounts[player] += 1;
  state.selectedPieceId = null;
  state.legalMoves = [];

  const prefix = options.timeout ? `${getPlayerName(player)} 시간 초과 자동 배치` : getMoveLogPlayerName(player);
  state.log.push(`${prefix}: ${formatNode(nodeId)}에 배치`);
  state.moveNumber += 1;

  if (!options.timeout) {
    state.timeoutStreak[player] = 0;
  }

  if (doesChamPieceMakeMill(piece) && getAlivePieces(PLAYERS[player].next).length > 0) {
    startPendingCapture(player);
    render();
    restartTimer();
    scheduleAiTurn();
    return;
  }

  finishTurn(player);
}

function applyChamMove(piece, move, options = {}) {
  const from = piece.node;
  state.lastMove = {
    pieceId: piece.id,
    from,
    to: move.to,
    animated: false,
  };
  piece.node = move.to;
  piece.previousNode = from;
  state.selectedPieceId = null;
  state.legalMoves = [];

  const prefix = options.timeout ? `${getPlayerName(piece.player)} 시간 초과 자동 이동` : getMoveLogPlayerName(piece.player);
  state.log.push(`${prefix}: ${formatNode(from)} → ${formatNode(move.to)}`);
  state.moveNumber += 1;

  if (!options.timeout) {
    state.timeoutStreak[piece.player] = 0;
  }

  if (doesChamPieceMakeMill(piece) && getAlivePieces(PLAYERS[piece.player].next).length > 0) {
    startPendingCapture(piece.player);
    render();
    restartTimer();
    scheduleAiTurn();
    return;
  }

  finishTurn(piece.player);
}

function startPendingCapture(player) {
  state.pendingCapture = {
    player,
    opponent: PLAYERS[player].next,
  };
  state.secondsLeft = TURN_SECONDS;
}

function handlePendingCapture(piece) {
  const pending = state.pendingCapture;
  if (!pending || piece.player !== pending.opponent) return;
  if (state.lastMove) return;

  piece.alive = false;
  state.pendingCapture = null;
  state.selectedPieceId = null;
  state.legalMoves = [];
  state.capturedGhosts = [{
    id: piece.id,
    player: piece.player,
    node: piece.node,
    phase: "waiting",
  }];
  state.captureGhostToken += 1;
  const captureGhostToken = state.captureGhostToken;
  state.log.push(`${getMoveLogPlayerName(pending.player)}: ${formatNode(piece.node)} 말 따냄`);

  finishTurn(pending.player, {
    renderBeforeCapture: false,
    captureGhostToken,
    captureDelay: 0,
  });
}

function finishTurn(movedPlayer, options = {}) {
  evaluateEnd(movedPlayer);
  if (!state.result) {
    switchTurn();
    registerSignature(state);
    evaluateStartOfTurn();
  }

  render();
  if (options.captureGhostToken) {
    playCaptureGhostsAfterMove(options.captureGhostToken, options.captureDelay || 0);
  }
  restartTimer();
  scheduleAiTurn();
}

function doesChamPieceMakeMill(piece) {
  return getChamMillsForNode(piece.node)
    .some((line) => line.every((nodeId) => getPieceAt(nodeId)?.player === piece.player));
}

function getChamMillsForNode(nodeId) {
  if (state.map.ruleSet !== "chamGonu") return [];
  return (state.map.millLines || []).filter((line) => line.includes(String(nodeId)));
}

function getCapturablePieces() {
  if (!state.pendingCapture) return [];
  return getAlivePieces(state.pendingCapture.opponent);
}

function isChamPlacementTurn() {
  return (
    state?.map?.ruleSet === "chamGonu" &&
    !state.pendingCapture &&
    isChamPlacementPhase() &&
    getChamReserveLeft(state.currentPlayer) > 0
  );
}

function isChamPlacementPhase() {
  return (
    state?.map?.ruleSet === "chamGonu" &&
    (getChamReserveLeft("south") > 0 || getChamReserveLeft("north") > 0)
  );
}

function getChamReserveLeft(player) {
  if (state?.map?.ruleSet !== "chamGonu") return 0;
  return Math.max(0, state.map.reservePieces - (state.placedCounts?.[player] || 0));
}

function getChamAvailablePieceCount(player) {
  return getAlivePieces(player).length + getChamReserveLeft(player);
}

function getMoveLogPlayerName(player) {
  if (state.map.ruleSet !== "kingHunt") return getPlayerName(player);
  return player === state.map.kingPlayer ? "왕" : "졸";
}

function switchTurn() {
  state.currentPlayer = PLAYERS[state.currentPlayer].next;
  state.secondsLeft = TURN_SECONDS;
}

function playCaptureGhostsAfterMove(captureGhostToken, startDelay = CAPTURE_ANIMATION_START_MS) {
  if (!state.capturedGhosts?.length) return;
  const ghosts = state.capturedGhosts;

  window.setTimeout(() => {
    if (state.captureGhostToken !== captureGhostToken || state.capturedGhosts !== ghosts) return;
    state.capturedGhosts = ghosts.map((ghost) => ({ ...ghost, phase: "capturing" }));
    renderBoard();
  }, startDelay);

  window.setTimeout(() => {
    if (state.captureGhostToken !== captureGhostToken) return;
    state.capturedGhosts = [];
    renderBoard();
  }, startDelay + CAPTURE_FADE_MS + 80);
}

function updateHomeStatus(piece, from, to) {
  const zones = state.map.homeZones;
  if (!zones) return;
  const ownHome = new Set(zones[piece.player].map(String));
  if (ownHome.has(String(from)) && !ownHome.has(String(to))) {
    piece.leftHome = true;
  }
}

function resolveCaptures(piece, move = {}, fromNodeId = piece.node) {
  if (state.map.ruleSet === "kingHunt") {
    return resolveKingCaptures(piece, fromNodeId);
  }

  if (state.map.ruleSet === "surroundCapture") {
    return resolveSurroundCaptures(piece);
  }

  if (state.map.ruleSet === "wheelCapture") {
    return resolveWheelCaptures(piece, move);
  }

  if (state.map.ruleSet !== "sandwichGrid") return [];
  const captured = [];
  const [row, col] = parseGridNode(piece.node);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dr, dc] of directions) {
    const middleId = gridNode(row + dr, col + dc);
    const farId = gridNode(row + dr * 2, col + dc * 2);
    if (!getNodeMaybe(middleId) || !getNodeMaybe(farId)) continue;

    const middlePiece = getPieceAt(middleId);
    const farPiece = getPieceAt(farId);
    if (middlePiece && middlePiece.player !== piece.player && farPiece && farPiece.player === piece.player) {
      middlePiece.alive = false;
      captured.push(middlePiece);
    }
  }

  return captured;
}

function resolveWheelCaptures(piece, move = {}) {
  if (!move.capturePieceId) return [];

  const captureNode = move.captureNode || move.to;
  const capturedPiece = state.pieces.find((item) => (
    item.id === move.capturePieceId &&
    item.alive &&
    item.player !== piece.player &&
    item.node === captureNode
  ));
  if (!capturedPiece) return [];

  capturedPiece.alive = false;
  return [capturedPiece];
}

function resolveSurroundCaptures(piece) {
  const opponent = PLAYERS[piece.player].next;
  const captured = [];
  const captureLimit = state.map.captureLimit || Infinity;

  for (const opponentPiece of getAlivePieces(opponent)) {
    const neighbors = getNeighbors(opponentPiece.node);
    if (!neighbors.includes(piece.node)) continue;
    const blockers = neighbors.map((nodeId) => getPieceAt(nodeId));
    if (blockers.some((blocker) => !blocker || blocker.player !== piece.player)) continue;

    opponentPiece.alive = false;
    captured.push(opponentPiece);
    if (captured.length >= captureLimit) break;
  }

  return captured;
}

function resolveKingCaptures(piece, fromNodeId) {
  if (piece.player !== state.map.kingPlayer) return [];

  const beforePairs = getKingCapturePairsAt(fromNodeId);
  const beforePairKeys = new Set(beforePairs.map((pair) => getNodePairKey(pair.nodes)));
  const afterPairs = getKingCapturePairsAt(piece.node);
  const captured = [];
  const capturedIds = new Set();

  for (const pair of afterPairs) {
    if (beforePairKeys.has(getNodePairKey(pair.nodes))) continue;

    for (const nodeId of pair.nodes) {
      const capturedPiece = getPieceAt(nodeId);
      if (!capturedPiece || capturedIds.has(capturedPiece.id)) continue;

      capturedPiece.alive = false;
      captured.push(capturedPiece);
      capturedIds.add(capturedPiece.id);
    }
  }

  return captured;
}

function getNodePairKey(nodes) {
  return nodes.slice().sort().join("|");
}

function getKingCapturePairsAt(nodeId) {
  return [
    { axis: "horizontal", offsets: [[0, -1], [0, 1]] },
    { axis: "vertical", offsets: [[-1, 0], [1, 0]] },
  ]
    .map((item) => ({
      axis: item.axis,
      nodes: item.offsets.map(([rowOffset, colOffset]) => getKingNodeByOffset(nodeId, rowOffset, colOffset)),
    }))
    .filter((item) => (
      item.nodes.every(Boolean) &&
      item.nodes.every((targetNode) => getPieceAt(targetNode)?.player === state.map.soldierPlayer)
    ));
}

function evaluateEnd(movedPlayer) {
  if (state.map.ruleSet === "kingHunt") {
    evaluateKingGonuEnd();
    return;
  }

  const opponent = PLAYERS[movedPlayer].next;
  const opponentPieces = getAlivePieces(opponent);

  if (state.map.ruleSet === "chamGonu") {
    if (getChamAvailablePieceCount(opponent) <= 2) {
      state.result = {
        winner: movedPlayer,
        message: `${getPlayerName(movedPlayer)} 승리 · 상대 말이 2개 이하입니다.`,
      };
      return;
    }

    if (!isChamPlacementPhase() && !playerHasMove(opponent)) {
      state.result = {
        winner: movedPlayer,
        message: `${getPlayerName(movedPlayer)} 승리 · 상대가 움직일 수 없습니다.`,
      };
      return;
    }

    if (state.moveNumber > state.map.maxTurns) {
      state.result = {
        winner: null,
        message: `무승부 · ${state.map.maxTurns}턴 제한에 도달했습니다.`,
      };
    }
    return;
  }

  if (state.map.ruleSet === "surroundCapture" && opponentPieces.length <= 2) {
    state.result = {
      winner: movedPlayer,
      message: `${getPlayerName(movedPlayer)} 승리 · 상대 말이 2개 이하입니다.`,
    };
    return;
  }

  if (state.map.ruleSet === "wheelCapture" && opponentPieces.length === 0) {
    state.result = {
      winner: movedPlayer,
      message: `${getPlayerName(movedPlayer)} 승리 · 상대 말을 모두 따냈습니다.`,
    };
    return;
  }

  if (state.map.ruleSet === "wheelCapture") {
    if (state.moveNumber > state.map.maxTurns) {
      state.result = {
        winner: null,
        message: `무승부 · ${state.map.maxTurns}턴 제한에 도달했습니다.`,
      };
    }
    return;
  }

  if (state.map.ruleSet === "sandwichGrid" && opponentPieces.length <= 1) {
    state.result = {
      winner: movedPlayer,
      message: `${getPlayerName(movedPlayer)} 승리 · 상대 말이 1개 이하입니다.`,
    };
    return;
  }

  if (!playerHasMove(opponent)) {
    state.result = {
      winner: movedPlayer,
      message: `${getPlayerName(movedPlayer)} 승리 · 상대가 움직일 수 없습니다.`,
    };
    return;
  }

  if (state.moveNumber > state.map.maxTurns) {
    state.result = {
      winner: null,
      message: `무승부 · ${state.map.maxTurns}턴 제한에 도달했습니다.`,
    };
  }
}

function evaluateStartOfTurn() {
  if (state.map.ruleSet === "kingHunt") {
    evaluateKingGonuEnd();
    return;
  }

  if (state.map.ruleSet === "wheelCapture") {
    return;
  }

  if (state.map.ruleSet === "chamGonu" && isChamPlacementPhase()) {
    return;
  }

  if (!playerHasMove(state.currentPlayer)) {
    const winner = PLAYERS[state.currentPlayer].next;
    state.result = {
      winner,
      message: `${getPlayerName(winner)} 승리 · 상대가 움직일 수 없습니다.`,
    };
  }
}

function evaluateKingGonuEnd() {
  const soldierCount = getAlivePieces(state.map.soldierPlayer).length;
  if (soldierCount === 0) {
    state.result = {
      winner: state.map.kingPlayer,
      message: "왕 승리 · 졸이 모두 제거되었습니다.",
    };
    return;
  }

  if (isKingTrapped()) {
    state.result = {
      winner: state.map.soldierPlayer,
      message: "졸 승리 · 왕의 일반 이동과 점프가 모두 막혔습니다.",
    };
  }
}

function isKingTrapped() {
  const king = getKingPiece();
  if (!king) return true;
  return getKingNormalMoves(king).length === 0 && state.kingJumpsLeft <= 0;
}

function registerSignature(nextState) {
  const signature = getBoardSignature(nextState);
  const count = (nextState.signatures.get(signature) || 0) + 1;
  nextState.signatures.set(signature, count);
  if (count >= 3 && !nextState.result) {
    nextState.result = {
      winner: null,
      message: "무승부 · 같은 말 배치가 3회 반복되었습니다.",
    };
  }
}

function getBoardSignature(nextState) {
  const pieceSignature = nextState.pieces
    .filter((piece) => piece.alive)
    .map((piece) => `${piece.player}:${piece.node}`)
    .sort()
    .join("|");

  if (nextState.map.ruleSet === "kingHunt") {
    return `turn:${nextState.currentPlayer}|jumps:${nextState.kingJumpsLeft}|${pieceSignature}`;
  }

  if (nextState.map.ruleSet === "chamGonu") {
    const placed = `placed:${nextState.placedCounts.south},${nextState.placedCounts.north}`;
    const pending = nextState.pendingCapture ? `pending:${nextState.pendingCapture.player}` : "pending:none";
    return `turn:${nextState.currentPlayer}|${placed}|${pending}|${pieceSignature}`;
  }

  return pieceSignature;
}

function getLegalMoves(piece) {
  if (state.map.movement === "kingGonu") {
    return getKingGonuMoves(piece);
  }

  if (state.map.movement === "wheel") {
    return getWheelMoves(piece);
  }

  if (state.map.movement === "slideOrthogonal") {
    return getSlidingGridMoves(piece);
  }

  const neighbors = getNeighbors(piece.node);
  const moves = neighbors
    .filter((nodeId) => !getPieceAt(nodeId))
    .filter((nodeId) => state.map.allowBacktrack || nodeId !== piece.previousNode)
    .filter((nodeId) => respectsMapRules(piece, nodeId))
    .map((nodeId) => ({ pieceId: piece.id, from: piece.node, to: nodeId }));

  if (isFirstCenterMoveBlocked(piece)) {
    return moves.filter((move) => move.to !== "c");
  }

  return moves;
}

function getKingGonuMoves(piece) {
  if (piece.player === state.map.kingPlayer) {
    return state.kingJumpMode ? getKingJumpMoves(piece) : getKingNormalMoves(piece);
  }

  return getKingSoldierMoves(piece);
}

function getKingNormalMoves(piece) {
  if (piece.node === state.map.kingBaseNode) {
    const targets = state.moveNumber === 1
      ? state.map.openingKingTargets || []
      : getNeighbors(piece.node);
    return targets
      .filter((nodeId) => !getPieceAt(nodeId))
      .map((nodeId) => ({ pieceId: piece.id, from: piece.node, to: nodeId }));
  }

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const moves = [];

  for (const [rowDirection, colDirection] of directions) {
    let distance = 1;
    while (true) {
      const nodeId = getKingNodeByOffset(piece.node, rowDirection * distance, colDirection * distance);
      if (!nodeId || getPieceAt(nodeId)) break;

      moves.push({ pieceId: piece.id, from: piece.node, to: nodeId });
      distance += 1;
    }
  }

  return moves;
}

function getKingSoldierMoves(piece) {
  const boardNodes = new Set(state.map.kingBoardNodes || []);
  return getNeighbors(piece.node)
    .filter((nodeId) => boardNodes.has(nodeId))
    .filter((nodeId) => !getPieceAt(nodeId))
    .map((nodeId) => ({ pieceId: piece.id, from: piece.node, to: nodeId }));
}

function getKingJumpMoves(piece) {
  if (state.kingJumpsLeft <= 0) return [];

  return (state.map.kingBoardNodes || [])
    .filter((nodeId) => !getPieceAt(nodeId))
    .map((nodeId) => ({ pieceId: piece.id, from: piece.node, to: nodeId, jump: true }));
}

function getWheelMoves(piece) {
  const moves = new Map();
  const wheelEdges = new Set((state.map.wheelEdges || []).map(([from, to]) => getEdgeKey(from, to)));

  // Ordinary moves stay one step. Captures are only created by wheel-turn moves below.
  for (const [from, to] of state.map.edges) {
    if (wheelEdges.has(getEdgeKey(from, to))) continue;
    const a = String(from);
    const b = String(to);
    const target = a === piece.node ? b : b === piece.node ? a : null;
    if (!target || target === piece.previousNode || getPieceAt(target)) continue;
    if (respectsMapRules(piece, target)) {
      moves.set(`move:${target}`, { pieceId: piece.id, from: piece.node, to: target });
    }
  }

  for (const wheelPath of state.map.wheelPaths || []) {
    const entry = String(piece.node);
    const exit = getWheelExitNode(wheelPath, entry);
    if (!exit || exit === piece.previousNode) continue;

    addWheelRunMoves(moves, piece, wheelPath, exit);
  }

  return Array.from(moves.values()).sort((a, b) => Number(Boolean(b.capturePieceId)) - Number(Boolean(a.capturePieceId)));
}

function getWheelExitNode(wheelPath, entryNodeId) {
  if (String(wheelPath.from) === String(entryNodeId)) return String(wheelPath.to);
  if (String(wheelPath.to) === String(entryNodeId)) return String(wheelPath.from);
  return null;
}

function addWheelRunMoves(moves, piece, wheelPath, exitNodeId) {
  const startNode = piece.node;
  const direction = getWheelExitDirection(exitNodeId);
  if (!direction) return;

  const arcPath = getWheelArcMovePath(startNode, exitNodeId, wheelPath);
  const nodes = [exitNodeId, ...getStraightNodesFrom(exitNodeId, direction)];

  for (let index = 0; index < nodes.length; index += 1) {
    const nodeId = nodes[index];
    const blockingPiece = getPieceAt(nodeId);
    const movePath = appendStraightPathToWheelPath(arcPath, exitNodeId, nodeId);

    if (!blockingPiece) {
      moves.set(`move:${nodeId}`, {
        pieceId: piece.id,
        from: startNode,
        to: nodeId,
        path: movePath,
        wheelTurn: true,
      });
      continue;
    }

    if (blockingPiece.player !== piece.player) {
      const landingNodeId = getWheelCaptureLandingNode(nodes, index);
      if (!landingNodeId || getPieceAt(landingNodeId)) break;

      moves.set(`capture:${landingNodeId}:${blockingPiece.id}`, {
        pieceId: piece.id,
        from: startNode,
        to: landingNodeId,
        path: appendStraightPathToWheelPath(movePath, nodeId, landingNodeId),
        wheelTurn: true,
        captureNode: nodeId,
        capturePieceId: blockingPiece.id,
      });
    }
    break;
  }
}

function getWheelCaptureLandingNode(straightNodes, captureIndex) {
  return straightNodes[captureIndex + 1] || null;
}

function getStraightNodesFrom(nodeId, direction) {
  const [row, col] = parseWheelNode(nodeId);
  const nodes = [];
  let currentNode = nodeId;
  let nextRow = row + direction[0];
  let nextCol = col + direction[1];

  while (nextRow >= 0 && nextRow < 4 && nextCol >= 0 && nextCol < 4) {
    const nextNode = wheelGridNode(nextRow, nextCol);
    if (!getNodeMaybe(nextNode)) break;
    if (!hasOrdinaryWheelLine(currentNode, nextNode)) break;
    nodes.push(nextNode);
    currentNode = nextNode;
    nextRow += direction[0];
    nextCol += direction[1];
  }

  return nodes;
}

function hasOrdinaryWheelLine(fromNodeId, toNodeId) {
  const key = getEdgeKey(fromNodeId, toNodeId);
  const wheelEdges = new Set((state.map.wheelEdges || []).map(([from, to]) => getEdgeKey(from, to)));
  if (wheelEdges.has(key)) return false;
  return state.map.edges.some(([from, to]) => getEdgeKey(from, to) === key);
}

function getWheelExitDirection(nodeId) {
  const [row, col] = parseWheelNode(nodeId);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;

  if (row === 0) return [1, 0];
  if (row === 3) return [-1, 0];
  if (col === 0) return [0, 1];
  if (col === 3) return [0, -1];
  return null;
}

function getWheelArcMovePath(fromNodeId, exitNodeId, wheelPath) {
  if (String(wheelPath.from) === String(fromNodeId) && String(wheelPath.to) === String(exitNodeId)) {
    return wheelPath.path;
  }
  if (String(wheelPath.to) === String(fromNodeId) && String(wheelPath.from) === String(exitNodeId)) {
    return wheelPath.reversePath || wheelPath.path;
  }

  const fromNode = getNode(fromNodeId);
  const exitNode = getNode(exitNodeId);
  const radius = wheelPath.radius || 16.67;
  return `M ${fromNode.x} ${fromNode.y} A ${radius} ${radius} 0 1 0 ${exitNode.x} ${exitNode.y}`;
}

function appendStraightPathToWheelPath(path, exitNodeId, targetNodeId) {
  if (String(exitNodeId) === String(targetNodeId)) return path;
  const target = getNode(targetNodeId);
  return `${path} L ${target.x} ${target.y}`;
}

function isFirstCenterMoveBlocked(piece) {
  if (!state.map.firstMoveCenterBan || state.moveNumber !== 1) return false;
  const blockedNodes = state.map.firstMoveCenterBlockedFrom?.[piece.player] || [];
  return blockedNodes.map(String).includes(piece.node);
}

function getSlidingGridMoves(piece) {
  const [row, col] = parseGridNode(piece.node);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const moves = [];

  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    const firstNode = gridNode(nextRow, nextCol);
    if (firstNode === piece.previousNode) continue;

    while (nextRow >= 0 && nextRow < state.map.gridSize && nextCol >= 0 && nextCol < state.map.gridSize) {
      const nodeId = gridNode(nextRow, nextCol);
      if (getPieceAt(nodeId)) break;
      if (nodeId !== piece.previousNode && respectsMapRules(piece, nodeId)) {
        moves.push({ pieceId: piece.id, from: piece.node, to: nodeId });
      }
      nextRow += dr;
      nextCol += dc;
    }
  }

  return moves;
}

function respectsMapRules(piece, targetNode) {
  const map = state.map;
  if (map.ruleSet !== "homeBlockade") return true;

  const zones = map.homeZones;
  const target = String(targetNode);
  const opponent = PLAYERS[piece.player].next;
  const opponentHome = new Set(zones[opponent].map(String));
  const ownHome = new Set(zones[piece.player].map(String));

  if (opponentHome.has(target)) return false;
  if (piece.leftHome && ownHome.has(target)) return false;

  return true;
}

function playerHasMove(player) {
  if (state.map.ruleSet === "chamGonu" && isChamPlacementPhase()) {
    return getChamReserveLeft(player) > 0 && state.map.nodes.some((nodeItem) => !getPieceAt(nodeItem.id));
  }

  return getAlivePieces(player).some((piece) => getLegalMoves(piece).length > 0);
}

function getAlivePieces(player) {
  return state.pieces.filter((piece) => piece.alive && (!player || piece.player === player));
}

function getKingPiece() {
  return state.pieces.find((piece) => piece.alive && piece.player === state.map.kingPlayer);
}

function getSelectedPiece() {
  return state.pieces.find((piece) => piece.id === state.selectedPieceId);
}

function getPieceAt(nodeId) {
  return state.pieces.find((piece) => piece.alive && piece.node === String(nodeId));
}

function getNode(nodeId) {
  return state.map.nodes.find((item) => item.id === String(nodeId));
}

function getNodeMaybe(nodeId) {
  return state.map.nodes.find((item) => item.id === String(nodeId));
}

function getNeighbors(nodeId) {
  const target = String(nodeId);
  const result = [];
  for (const [from, to] of state.map.edges) {
    const a = String(from);
    const b = String(to);
    if (a === target) result.push(b);
    if (b === target) result.push(a);
  }
  return result;
}

function getEdgeKey(from, to) {
  return [String(from), String(to)].sort().join("|");
}

function formatNode(nodeId) {
  return getNode(nodeId)?.label || String(nodeId);
}

function parseGridNode(nodeId) {
  return String(nodeId).split("-").map(Number);
}

function parseWheelNode(nodeId) {
  const [, row, col] = String(nodeId).split("-");
  return [Number(row), Number(col)];
}

function parseKingNode(nodeId) {
  const [, row, col] = String(nodeId).split("-");
  return [Number(row), Number(col)];
}

function getKingNodeByOffset(nodeId, rowOffset, colOffset) {
  const [row, col] = parseKingNode(nodeId);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;

  const target = `king-${row + rowOffset}-${col + colOffset}`;
  return getNodeMaybe(target) ? target : null;
}

function gridNode(row, col) {
  return `${row}-${col}`;
}

function wheelGridNode(row, col) {
  return `g-${row}-${col}`;
}

function restartTimer() {
  if (timerId) window.clearInterval(timerId);
  if (!state || state.result) return;
  if (appMode === "career") {
    renderInfo();
    return;
  }

  timerId = window.setInterval(() => {
    state.secondsLeft -= 1;
    if (state.secondsLeft <= 0) {
      handleTimeout();
    } else {
      renderInfo();
    }
  }, 1000);
}

function handleTimeout() {
  if (appMode === "career") return;
  if (timerId) window.clearInterval(timerId);
  const player = state.currentPlayer;
  state.timeoutStreak[player] += 1;

  if (state.pendingCapture) {
    const capturable = getCapturablePieces();
    if (capturable.length) {
      handlePendingCapture(capturable[Math.floor(Math.random() * capturable.length)]);
      return;
    }
  }

  if (isChamPlacementTurn()) {
    const emptyNodes = state.map.nodes
      .map((item) => item.id)
      .filter((nodeId) => !getPieceAt(nodeId));
    if (emptyNodes.length) {
      const nodeId = emptyNodes[Math.floor(Math.random() * emptyNodes.length)];
      placeChamPiece(nodeId, { timeout: true });
      return;
    }
  }

  if (state.timeoutStreak[player] >= 2) {
    const winner = PLAYERS[player].next;
    state.result = {
      winner,
      message: `${getPlayerName(winner)} 승리 · 상대가 2회 연속 시간 초과했습니다.`,
    };
    render();
    return;
  }

  const movable = getAlivePieces(player)
    .flatMap((piece) => getLegalMoves(piece))
    .filter(Boolean);

  if (movable.length === 0) {
    const winner = PLAYERS[player].next;
    state.result = {
      winner,
      message: `${getPlayerName(winner)} 승리 · 시간 초과 시 이동할 수가 없습니다.`,
    };
    render();
    return;
  }

  const move = movable[Math.floor(Math.random() * movable.length)];
  applyMove(move, { timeout: true });
}

function clearAiTimer() {
  if (aiTimerId) {
    window.clearTimeout(aiTimerId);
    aiTimerId = null;
  }
  if (state) state.aiThinking = false;
}

function getTurnActor() {
  return state?.pendingCapture?.player || state?.currentPlayer;
}

function isAiTurn() {
  return isAiMode() && state && !state.result && getTurnActor() === AI_PLAYER;
}

function isAiMode() {
  return appMode === "career" || appMode === "single";
}

function scheduleAiTurn(delay = AI_THINK_MS) {
  if (aiTimerId) window.clearTimeout(aiTimerId);
  if (!isAiTurn()) return;

  const animationDelay = state.lastMove ? PIECE_MOVE_MS + 120 : 0;
  const captureDelay = state.capturedGhosts?.length ? CAPTURE_FADE_MS + 120 : 0;
  const wait = Math.max(delay, animationDelay, captureDelay);

  state.aiThinking = true;
  renderInfo();
  aiTimerId = window.setTimeout(runAiTurn, wait);
}

function runAiTurn() {
  aiTimerId = null;
  if (!isAiTurn()) return;

  if (state.lastMove) {
    scheduleAiTurn(120);
    return;
  }

  const action = chooseAiAction();
  state.aiThinking = false;
  if (!action) return;

  if (action.type === "capture") {
    const piece = state.pieces.find((item) => item.id === action.pieceId);
    if (piece) handlePendingCapture(piece);
    return;
  }

  if (action.type === "placement") {
    placeChamPiece(action.nodeId, { ai: true });
    return;
  }

  applyMove(action.move, { ai: true });
}

function chooseAiAction() {
  const actor = getTurnActor();
  const actions = getAiActions(actor);
  if (!actions.length) return null;

  const config = getAiConfig();
  if (Math.random() < config.mistakeRate) {
    return pickRandom(actions);
  }

  const candidates = config.depth <= 1
    ? actions
    : rankActionsForSearch(actions, actor, config.candidateLimit * 2);
  const scored = candidates.map((action) => ({
    action,
    score: scoreAiAction(action, actor, config.depth, config.candidateLimit),
  })).sort((a, b) => b.score - a.score);

  const bestScore = scored[0].score;
  const bestActions = scored.filter((item) => item.score >= bestScore - 0.001).map((item) => item.action);
  return pickRandom(bestActions);
}

function getAiConfig() {
  const base = AI_DIFFICULTIES[aiDifficulty] || AI_DIFFICULTIES.normal;
  const override = AI_MAP_DIFFICULTY_OVERRIDES[aiDifficulty]?.[state.map.id];
  return override ? { ...base, ...override } : base;
}

function getAiActions(actor) {
  if (!state || state.result) return [];

  if (state.pendingCapture) {
    if (state.pendingCapture.player !== actor) return [];
    return getCapturablePieces().map((piece) => ({ type: "capture", pieceId: piece.id }));
  }

  if (actor !== state.currentPlayer) return [];

  if (isChamPlacementTurn()) {
    return state.map.nodes
      .filter((item) => !getPieceAt(item.id))
      .map((item) => ({ type: "placement", nodeId: item.id }));
  }

  return getAlivePieces(actor).flatMap((piece) =>
    getLegalMoves(piece).map((move) => ({ type: "move", move }))
  );
}

function scoreAiAction(action, aiPlayer, depth, candidateLimit) {
  const nextState = getSimulatedStateAfterAction(action);
  if (!nextState) return Number.NEGATIVE_INFINITY;

  return withTemporaryState(nextState, () => {
    if (depth <= 1 || state.result) return evaluateAiState(aiPlayer);
    return minimaxAi(depth - 1, aiPlayer, candidateLimit, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  });
}

function minimaxAi(depth, aiPlayer, candidateLimit, alpha, beta) {
  if (depth <= 0 || state.result) return evaluateAiState(aiPlayer);

  const actor = getTurnActor();
  const actions = getAiActions(actor);
  if (!actions.length) return evaluateAiState(aiPlayer);

  const maximizing = actor === aiPlayer;
  const candidates = rankActionsForSearch(actions, actor, candidateLimit);

  if (maximizing) {
    let best = Number.NEGATIVE_INFINITY;
    for (const action of candidates) {
      best = Math.max(best, scoreAiAction(action, aiPlayer, depth, candidateLimit));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Number.POSITIVE_INFINITY;
  for (const action of candidates) {
    best = Math.min(best, scoreAiAction(action, aiPlayer, depth, candidateLimit));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function rankActionsForSearch(actions, actor, limit) {
  return [...actions]
    .map((action) => ({ action, score: getQuickActionScore(action, actor) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.action);
}

function getQuickActionScore(action, actor) {
  if (action.type === "capture") {
    const piece = state.pieces.find((item) => item.id === action.pieceId);
    return 120 + getAiPieceValue(piece, actor) + getNodeScore(piece?.node);
  }

  if (action.type === "placement") {
    return getNodeScore(action.nodeId);
  }

  const move = action.move;
  return getNodeScore(move.to) + (move.jump ? 24 : 0);
}

function getSimulatedStateAfterAction(action) {
  const nextState = cloneStateForAi(state);
  return withTemporaryState(nextState, () => {
    applyAiActionToSimulation(action);
    return nextState;
  });
}

function cloneStateForAi(source) {
  return {
    ...source,
    pieces: source.pieces.map((piece) => ({ ...piece })),
    legalMoves: [],
    log: [...source.log],
    signatures: new Map(source.signatures),
    timeoutStreak: { ...source.timeoutStreak },
    lastMove: null,
    capturedGhosts: [],
    placedCounts: { ...source.placedCounts },
    pendingCapture: source.pendingCapture ? { ...source.pendingCapture } : null,
    result: source.result ? { ...source.result } : null,
    aiThinking: false,
  };
}

function withTemporaryState(nextState, callback) {
  const previousState = state;
  state = nextState;
  try {
    return callback();
  } finally {
    state = previousState;
  }
}

function applyAiActionToSimulation(action) {
  const actor = getTurnActor();

  if (action.type === "capture") {
    const piece = state.pieces.find((item) => item.id === action.pieceId && item.alive);
    if (!piece || !state.pendingCapture || piece.player !== state.pendingCapture.opponent) return;
    piece.alive = false;
    state.pendingCapture = null;
    finishSimulatedTurn(actor);
    return;
  }

  if (action.type === "placement") {
    if (!isChamPlacementTurn() || getPieceAt(action.nodeId) || !getNodeMaybe(action.nodeId)) return;
    const player = state.currentPlayer;
    const pieceNumber = state.placedCounts[player] + 1;
    const piece = {
      id: `${player}-${pieceNumber}`,
      player,
      node: String(action.nodeId),
      alive: true,
      leftHome: false,
      previousNode: null,
    };
    state.pieces.push(piece);
    state.placedCounts[player] += 1;
    state.moveNumber += 1;
    if (doesChamPieceMakeMill(piece)) captureBestSimulatedPiece(player);
    finishSimulatedTurn(player);
    return;
  }

  const piece = state.pieces.find((item) => item.id === action.move.pieceId && item.alive);
  if (!piece) return;

  const from = piece.node;
  piece.node = action.move.to;
  piece.previousNode = from;
  state.moveNumber += 1;

  if (state.map.ruleSet === "chamGonu") {
    if (doesChamPieceMakeMill(piece)) captureBestSimulatedPiece(piece.player);
    finishSimulatedTurn(piece.player);
    return;
  }

  updateHomeStatus(piece, from, action.move.to);
  applyKingJumpUse(action.move);
  resolveCaptures(piece, action.move, from);
  finishSimulatedTurn(piece.player);
}

function captureBestSimulatedPiece(player) {
  const opponent = PLAYERS[player].next;
  const victim = getAlivePieces(opponent)
    .sort((a, b) => getAiPieceValue(b, player) - getAiPieceValue(a, player))[0];
  if (victim) victim.alive = false;
}

function finishSimulatedTurn(movedPlayer) {
  state.selectedPieceId = null;
  state.legalMoves = [];
  state.kingJumpMode = false;
  state.pendingCapture = null;

  evaluateEnd(movedPlayer);
  if (!state.result) {
    switchTurn();
    registerSignature(state);
    evaluateStartOfTurn();
  }
}

function evaluateAiState(aiPlayer) {
  if (state.result) {
    if (!state.result.winner) return 0;
    return state.result.winner === aiPlayer ? 100000 : -100000;
  }

  if (state.map.ruleSet === "kingHunt") {
    return evaluateKingAiState(aiPlayer);
  }

  const opponent = PLAYERS[aiPlayer].next;
  const aiAlive = getAlivePieces(aiPlayer).length;
  const opponentAlive = getAlivePieces(opponent).length;
  const reserveScore = state.map.ruleSet === "chamGonu"
    ? (getChamReserveLeft(aiPlayer) - getChamReserveLeft(opponent)) * 18
    : 0;
  const mobilityScore = (countPlayerMoves(aiPlayer) - countPlayerMoves(opponent)) * 5;
  const positionScore = getPositionScore(aiPlayer) - getPositionScore(opponent);

  return (aiAlive - opponentAlive) * 90 + reserveScore + mobilityScore + positionScore;
}

function evaluateKingAiState(aiPlayer) {
  const king = getKingPiece();
  const soldierCount = getAlivePieces(state.map.soldierPlayer).length;
  const kingMobility = king ? getKingNormalMoves(king).length : 0;
  const removedSoldiers = state.map.initial[state.map.soldierPlayer].length - soldierCount;

  if (aiPlayer === state.map.kingPlayer) {
    return removedSoldiers * 120 + state.kingJumpsLeft * 35 + kingMobility * 12;
  }

  return soldierCount * 30 - state.kingJumpsLeft * 40 - kingMobility * 18;
}

function countPlayerMoves(player) {
  return getAlivePieces(player).reduce((total, piece) => total + getLegalMoves(piece).length, 0);
}

function getPositionScore(player) {
  return getAlivePieces(player).reduce((total, piece) => total + getNodeScore(piece.node), 0);
}

function getNodeScore(nodeId) {
  const item = getNodeMaybe(nodeId);
  if (!item) return 0;
  const distance = Math.hypot(item.x - 50, item.y - 50);
  return Math.max(0, 40 - distance);
}

function getAiPieceValue(piece, perspectivePlayer) {
  if (!piece) return 0;
  if (state.map.ruleSet === "kingHunt" && piece.player === state.map.kingPlayer) return 900;
  if (piece.player === perspectivePlayer) return 100;
  return 100;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function openHomeScreen() {
  clearAiTimer();
  appMode = "local";
  dom.difficultyPanel.classList.add("hidden");
  dom.homeScreen.classList.remove("hidden");
  if (state) renderInfo();
}

function startSelectedMode(mode, difficulty = aiDifficulty) {
  clearAiTimer();
  if (mode === "career" && !isCareerDifficultyUnlocked(difficulty)) return;

  appMode = mode;
  aiDifficulty = difficulty;
  if (mode === "career") {
    activeMapId = getCareerStartMapId(difficulty);
  }
  dom.homeScreen.classList.add("hidden");
  startGame(activeMapId);
}

dom.singleModeButton.addEventListener("click", () => {
  dom.difficultyPanel.classList.add("hidden");
  startSelectedMode("local");
});
dom.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => startSelectedMode("career", button.dataset.difficulty || "normal"));
});
dom.careerModeButton.addEventListener("click", () => {
  renderDifficultyButtons();
  dom.difficultyPanel.classList.toggle("hidden");
});
dom.onlineModeButton.addEventListener("click", () => startSelectedMode("online"));
dom.homeButton.addEventListener("click", openHomeScreen);
dom.resetButton.addEventListener("click", () => startGame(activeMapId));
dom.kingJumpButton?.addEventListener("click", toggleKingJumpMode);
dom.flipButton.addEventListener("click", () => {
  flipped = !flipped;
  renderBoard();
});
dom.southNameInput.addEventListener("input", () => updatePlayerName("south", dom.southNameInput.value));
dom.northNameInput.addEventListener("input", () => updatePlayerName("north", dom.northNameInput.value));
dom.swapSeatsButton.addEventListener("click", () => {
  const south = playerNames.south;
  playerNames.south = playerNames.north;
  playerNames.north = south;
  savePlayerNames();
  render();
});

startGame(activeMapId);
