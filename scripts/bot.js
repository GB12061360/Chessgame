class CrimsonBot {
  constructor(game, options = {}) {
    this.game = game;
    this.randomness = options.randomness ?? 0.35;
    this.aggression = options.aggression ?? 1.1;
    this.pieceValues = {
      p: 100,
      n: 305,
      b: 315,
      r: 500,
      q: 900,
      k: 20000,
    };
    this.pieceSquareTables = this.createPieceSquareTables();
  }

  createPieceSquareTables() {
    const mirror = (table) => table.slice().reverse();
    const pawn = [
      0, 5, 5, 0, 5, 10, 50, 0,
      0, 10, -5, 0, 5, 10, 10, 0,
      0, 10, -10, 20, 25, 5, 10, 0,
      5, 5, 10, 25, 30, 10, 5, 5,
      10, 10, 20, 30, 35, 20, 10, 10,
      15, 15, 20, 25, 25, 20, 15, 15,
      30, 30, 30, 35, 35, 30, 30, 30,
      0, 0, 0, 0, 0, 0, 0, 0,
    ];
    const knight = [
      -30, -20, -10, -10, -10, -10, -20, -30,
      -20, -5, 0, 5, 5, 0, -5, -20,
      -10, 5, 10, 15, 15, 10, 5, -10,
      -10, 0, 15, 20, 20, 15, 0, -10,
      -10, 5, 15, 20, 20, 15, 5, -10,
      -10, 0, 10, 15, 15, 10, 0, -10,
      -20, -5, 0, 0, 0, 0, -5, -20,
      -30, -20, -10, -10, -10, -10, -20, -30,
    ];
    const bishop = [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 10, 0, 0, 10, 0, -10,
      -10, 10, 5, 10, 10, 5, 10, -10,
      -5, 0, 10, 10, 10, 10, 0, -5,
      0, 5, 10, 10, 10, 10, 5, 0,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20,
    ];
    const rook = [
      0, 0, 5, 10, 10, 5, 0, 0,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      5, 10, 10, 10, 10, 10, 10, 5,
      0, 0, 0, 5, 5, 0, 0, 0,
    ];
    const queen = [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 5, 0, 0, 5, 0, -10,
      -10, 5, 5, 5, 5, 5, 5, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 5, -10,
      -10, 0, 5, 0, 0, 5, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20,
    ];
    const king = [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20,
    ];

    return {
      w: {
        p: mirror(pawn),
        n: mirror(knight),
        b: mirror(bishop),
        r: mirror(rook),
        q: mirror(queen),
        k: mirror(king),
      },
      b: {
        p: pawn,
        n: knight,
        b: bishop,
        r: rook,
        q: queen,
        k: king,
      },
    };
  }

  chooseMove() {
    if (this.game.getTurn() !== 'b') return null;
    const legalMoves = this.collectLegalMoves('b');
    if (!legalMoves.length) return null;

    const scored = legalMoves.map((move) => ({
      move,
      score: this.scoreMove(move),
    }));
    scored.sort((a, b) => b.score - a.score);

    const bestScore = scored[0].score;
    const softness = 140;
    const candidates = scored.filter((entry) => entry.score >= bestScore - softness);
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    return choice.move;
  }

  collectLegalMoves(color) {
    const positions = this.game.pieces(color);
    const moves = [];
    positions.forEach(({ square }) => {
      const pieceMoves = this.game.moves(square);
      pieceMoves.forEach((move) => moves.push(move));
    });
    return moves;
  }

  scoreMove(move) {
    const record = this.game.makeMove(move);
    if (!record) return Number.NEGATIVE_INFINITY;
    let score = this.evaluateBoard(this.game.exportBoard());
    if (record.checkmate) {
      score = Number.POSITIVE_INFINITY;
    } else {
      if (record.captured) {
        score += this.pieceValues[record.captured.type] * 0.9;
      }
      if (record.flags && record.flags.capture && record.piece !== 'p') {
        score += 25;
      }
      if (record.check) {
        score += 35 * this.aggression;
      }
      if (record.draw) {
        score -= 120;
      }
      if (record.flags && record.flags.castle) {
        score += 15;
      }
    }
    this.game.undo();
    score += (Math.random() - 0.5) * this.randomness * 120;
    return score;
  }

  evaluateBoard(board) {
    let total = 0;
    for (let rank = 0; rank < 8; rank += 1) {
      for (let file = 0; file < 8; file += 1) {
        const piece = board[rank][file];
        if (!piece) continue;
        const baseValue = this.pieceValues[piece.type] || 0;
        const index = rank * 8 + file;
        const positional = this.pieceSquareTables[piece.color][piece.type][index] || 0;
        const modifier = piece.color === 'b' ? 1 : -1;
        total += modifier * (baseValue + positional * 0.6);
      }
    }
    return total;
  }
}

window.CrimsonBot = CrimsonBot;
