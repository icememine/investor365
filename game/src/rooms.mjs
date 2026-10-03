// Room data: bounds, colliders, interaction spots, ghost and guest behaviour per room.
// World coordinates are 1000 × 562 for every room; actor positions are their feet.
// Spot `kind` decides what interacting does (see Simulation.interact):
//   hide · rest · effect · clue · ticket · wardrobe · coffin · lost · exit · entrance

export const ROOMS = {
  cemetery: {
    id: 'cemetery',
    name: 'PHÒNG NGHĨA ĐỊA',
    art: 'cemetery',
    next: 'dining',
    bounds: {x0: 54, x1: 949, y0: 240, y1: 521},
    // Painted by art.mjs from these same rectangles, so collisions always match the picture.
    blocks: [
      {x: 60, y: 252, w: 118, h: 38, art: 'bench'},
      {x: 236, y: 300, w: 44, h: 26, art: 'grave'},
      {x: 330, y: 372, w: 44, h: 26, art: 'grave'},
      {x: 228, y: 440, w: 44, h: 26, art: 'grave'},
      {x: 440, y: 330, w: 150, h: 64, art: 'crypt'},
      {x: 668, y: 296, w: 44, h: 26, art: 'grave'},
      {x: 780, y: 400, w: 44, h: 26, art: 'grave'},
      {x: 892, y: 322, w: 52, h: 118, art: 'coffin'},
    ],
    // Loose boards: walking or running across them makes a sound the zombie hears.
    creaky: [{x: 560, y: 440, w: 200, h: 62}],
    spots: [
      {id: 'bench', kind: 'rest', x: 120, y: 312, label: 'Ghế dưới đèn · nghỉ'},
      {id: 'coat', kind: 'hide', x: 806, y: 262, label: 'Áo khoác treo · nấp', hint: 'chiếc áo khoác treo gần lối ra', torchReveals: true},
      {id: 'coffin', kind: 'coffin', x: 874, y: 382, label: 'Quan tài đứng'},
      {id: 'clip', kind: 'lost', x: 250, y: 496, label: 'Có gì lấp lánh…'},
      {id: 'door', kind: 'exit', x: 902, y: 262, label: 'Lối sang Bàn Tiệc'},
      {id: 'entrance', kind: 'entrance', x: 84, y: 500, label: 'Cửa vào / đón khách'},
    ],
    coin: {x: 156, y: 420},
    start: {x: 170, y: 470},
    companionOffsets: [{x: -50, y: -30}, {x: -60, y: 25}],
    restPoint: {x: 128, y: 330},
    ghost: {
      kind: 'zombie', name: 'Xác Sống', sprite: 4,
      spawn: {x: 515, y: 420},
      patrol: [{x: 520, y: 420}, {x: 360, y: 330}, {x: 620, y: 300}, {x: 700, y: 370}, {x: 400, y: 470}],
      retreat: {x: 515, y: 300},
    },
    employeeSprite: 4,
    admitSpot: 'entrance',
    guestSpawn: [{x: 84, y: 470}, {x: 110, y: 500}],
    guestExit: {x: 902, y: 266},
    routes: [
      [{x: 150, y: 470}, {x: 310, y: 330}, {x: 420, y: 300}, {x: 620, y: 420}, {x: 640, y: 270}, {x: 840, y: 300}, {x: 902, y: 266}],
      [{x: 190, y: 500}, {x: 330, y: 470}, {x: 520, y: 420}, {x: 660, y: 470}, {x: 760, y: 350}, {x: 860, y: 280}, {x: 902, y: 266}],
    ],
    intro: {
      visitor: 'Na: Nghe kìa… tiếng gì cót két vậy?',
      employee: 'Mr. D: Xác Sống trực Nghĩa Địa. Đặt loa, chọn chỗ chui ra, rồi mở cửa đón khách.',
    },
  },

  dining: {
    id: 'dining',
    name: 'BÀN TIỆC MA CÀ RỒNG',
    art: 'world',
    bounds: {x0: 54, x1: 949, y0: 240, y1: 521},
    blocks: [
      {x: 365, y: 180, w: 275, h: 144},
      {x: 878, y: 310, w: 76, h: 171},
      {x: 58, y: 431, w: 134, h: 76},
    ],
    creaky: [],
    spots: [
      {id: 'curtain', kind: 'hide', x: 105, y: 265, label: 'Rèm · nấp / bước ra', hint: 'rèm bên trái'},
      {id: 'portrait', kind: 'clue', clue: 'name', x: 258, y: 262, label: 'Bảng tên cũ'},
      {id: 'ticket', kind: 'ticket', clue: 'ticket', x: 460, y: 346, label: 'Vé 000 / đóng mộc'},
      {id: 'bell', kind: 'effect', x: 606, y: 346, label: 'Rung chuông'},
      {id: 'tape', kind: 'clue', clue: 'tape', x: 746, y: 262, label: 'Máy cát sét'},
      {id: 'bench', kind: 'rest', x: 174, y: 410, label: 'Ghế nghỉ'},
      {id: 'wardrobe', kind: 'wardrobe', x: 847, y: 401, label: 'Tủ phục trang / phân ca'},
      {id: 'door', kind: 'exit', x: 887, y: 261, label: 'Cửa ra / đón khách'},
    ],
    start: {x: 500, y: 483},
    companionOffsets: [{x: -80, y: -6}, {x: 80, y: -6}],
    restPoint: {x: 220, y: 410},
    story: true,
    anPoint: {x: 680, y: 450},
    ghost: {
      kind: 'vampire', name: 'Ma Cà Rồng', sprite: 3,
      spawn: {x: 700, y: 340},
      patrol: [{x: 680, y: 350}, {x: 500, y: 410}, {x: 300, y: 360}, {x: 320, y: 270}, {x: 710, y: 450}],
      retreat: {x: 700, y: 430},
      stunRetreat: {x: 700, y: 300},
    },
    employeeSprite: 3,
    admitSpot: 'door',
    guestSpawn: [{x: 880, y: 280}, {x: 900, y: 298}],
    guestExit: {x: 885, y: 270},
    routes: [
      [{x: 780, y: 330}, {x: 680, y: 390}, {x: 500, y: 410}, {x: 300, y: 365}, {x: 260, y: 270}, {x: 450, y: 450}, {x: 720, y: 400}, {x: 887, y: 270}],
      [{x: 810, y: 370}, {x: 750, y: 275}, {x: 670, y: 430}, {x: 500, y: 375}, {x: 330, y: 345}, {x: 290, y: 420}, {x: 740, y: 370}, {x: 887, y: 270}],
    ],
    intro: {
      visitor: 'Na: Đứa nào ré lên trước thì bao nước nhé.',
      employee: 'Mr. D: Dàn đạo cụ, rồi tới cửa đón khách.',
    },
    // Shown when the visitor walks in from the previous room instead of starting here.
    arrive: 'Ma Cà Rồng: Nhà có khách. Mời ngồi.',
  },
};

export const ROOM_ORDER = ['cemetery', 'dining'];
