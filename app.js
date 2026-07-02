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
let flipped = false;
let playerNames = loadPlayerNames();

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
  const wheelOuterArcPath = (cx, cy, r, corner) => {
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
    const [start, end] = arcs[corner];
    return `M ${start[0]} ${start[1]} A ${r} ${r} 0 1 0 ${end[0]} ${end[1]}`;
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
    { from: gridIds[0][1], to: gridIds[1][0], path: wheelOuterArcPath(25, 25, 16.67, "tl") },
    { from: gridIds[1][3], to: gridIds[0][2], path: wheelOuterArcPath(75, 25, 16.67, "tr") },
    { from: gridIds[3][2], to: gridIds[2][3], path: wheelOuterArcPath(75, 75, 16.67, "br") },
    { from: gridIds[2][0], to: gridIds[3][1], path: wheelOuterArcPath(25, 75, 16.67, "bl") },
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
    ruleSet: "wheelBlockade",
    movement: "wheel",
    videoUrl: "https://youtu.be/UcIspN8Vzj0?si=mkTwJWiCY617NLu6",
    description: "4x4 격자판 네 모서리에 바퀴 궤도가 붙은 고누입니다.",
    rules: [
      "격자판에서는 선을 따라 상하좌우 한 칸 이동합니다.",
      "바퀴 곡선에서는 한 번에 반대쪽 격자점으로 이동합니다.",
      "상대 말 4개가 모두 움직일 수 없으면 승리합니다.",
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
  };

  registerSignature(nextState);
  return nextState;
}

function renderMapList() {
  dom.mapCount.textContent = `${maps.length}종`;
  dom.mapList.innerHTML = "";

  for (const map of maps) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-card${map.id === activeMapId ? " active" : ""}`;
    button.dataset.map = map.id;
    const pieceSummary = map.ruleSet === "kingHunt"
      ? `왕 ${map.initial.north.length} · 졸 ${map.initial.south.length}`
      : map.ruleSet === "chamGonu"
        ? `말 ${map.reservePieces}개씩`
        : `말 ${map.initial.south.length}개씩`;
    button.innerHTML = `<strong>${map.name}</strong><span>${map.category} · ${pieceSummary}</span>`;
    button.addEventListener("click", () => {
      activeMapId = map.id;
      startGame(map.id);
    });
    dom.mapList.appendChild(button);
  }
}

function startGame(mapId = activeMapId) {
  const map = maps.find((item) => item.id === mapId) || maps[0];
  activeMapId = map.id;
  state = buildInitialState(map);
  render();
  restartTimer();
}

function render() {
  syncPlayerForm();
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
  return playerNames[player] || PLAYERS[player].label;
}

function getPieceShort(player) {
  const name = getPlayerName(player).trim();
  return name ? name.slice(0, 1) : PLAYERS[player].short;
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

  dom.turnLabel.textContent = state.result ? "종료" : turnName;
  dom.turnHint.textContent = state.result
    ? "새 판을 누르면 같은 자리로 다시 시작합니다."
    : getTurnHintText(isKingGonu);
  dom.turnCount.textContent = `${state.moveNumber}/${map.maxTurns}`;
  dom.timerLabel.textContent = state.result ? "정지" : `${state.secondsLeft}s`;
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
    dom.resultBanner.textContent = state.result.message;
    dom.resultBanner.classList.remove("hidden");
  } else {
    dom.resultBanner.classList.add("hidden");
  }
}

function getTurnHintText(isKingGonu) {
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
    "공통: 한 턴은 30초이며 2회 연속 시간 초과 시 패배합니다.",
  ];

  if (!map.allowBacktrack) {
    commonRules.unshift("공통: 직전 위치로 바로 되돌아갈 수 없습니다.");
  }

  return [
    ...map.rules,
    ...commonRules,
  ];
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
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || !piece.alive) return;

  if (state.pendingCapture) {
    handlePendingCapture(piece);
    return;
  }

  if (isChamPlacementTurn()) return;
  if (piece.player !== state.currentPlayer) return;

  if (state.map.ruleSet === "kingHunt" && piece.player !== state.map.kingPlayer) {
    state.kingJumpMode = false;
  }

  state.selectedPieceId = pieceId;
  state.legalMoves = getLegalMoves(piece);
  render();
}

function handleNodeClick(nodeId) {
  if (state.result || state.pendingCapture) return;

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

  for (const [from, to] of state.map.edges) {
    if (wheelEdges.has(getEdgeKey(from, to))) continue;
    const a = String(from);
    const b = String(to);
    const target = a === piece.node ? b : b === piece.node ? a : null;
    if (!target || target === piece.previousNode || getPieceAt(target)) continue;
    if (respectsMapRules(piece, target)) {
      moves.set(target, { pieceId: piece.id, from: piece.node, to: target });
    }
  }

  for (const track of state.map.wheelTracks || []) {
    const index = track.indexOf(piece.node);
    if (index < 0) continue;

    for (const direction of [-1, 1]) {
      let nextIndex = index + direction;
      if (track[nextIndex] === piece.previousNode) continue;

      while (nextIndex >= 0 && nextIndex < track.length) {
        const nodeId = track[nextIndex];
        if (getPieceAt(nodeId)) break;
        if (respectsMapRules(piece, nodeId)) {
          moves.set(nodeId, { pieceId: piece.id, from: piece.node, to: nodeId });
        }
        nextIndex += direction;
      }
    }
  }

  return Array.from(moves.values());
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

function restartTimer() {
  if (timerId) window.clearInterval(timerId);
  if (!state || state.result) return;

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
