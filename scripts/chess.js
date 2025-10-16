(function (global) {
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const PIECE_ORDER = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  function opposite(color) {
    return color === 'w' ? 'b' : 'w';
  }

  function deepCloneBoard(board) {
    return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  }

  function coordsToSquare(file, rank) {
    return `${FILES[file]}${8 - rank}`;
  }

  function squareToCoords(square) {
    if (!square || square.length !== 2) return null;
    const file = FILES.indexOf(square[0]);
    const rank = 8 - parseInt(square[1], 10);
    if (file < 0 || rank < 0 || file > 7 || rank > 7) return null;
    return { file, rank };
  }

  function createEmptyBoard() {
    const board = new Array(8);
    for (let rank = 0; rank < 8; rank += 1) {
      board[rank] = new Array(8).fill(null);
    }
    return board;
  }

  function initialBoard() {
    const board = createEmptyBoard();
    for (let file = 0; file < 8; file += 1) {
      board[0][file] = { type: PIECE_ORDER[file], color: 'b' };
      board[1][file] = { type: 'p', color: 'b' };
      board[6][file] = { type: 'p', color: 'w' };
      board[7][file] = { type: PIECE_ORDER[file], color: 'w' };
    }
    return board;
  }

  class Chess {
    constructor() {
      this.reset();
    }

    reset() {
      this.board = initialBoard();
      this.turn = 'w';
      this.castling = {
        w: { k: true, q: true },
        b: { k: true, q: true },
      };
      this.enPassant = null;
      this.halfmoveClock = 0;
      this.fullmoveNumber = 1;
      this.history = [];
    }

    cloneState() {
      return {
        board: deepCloneBoard(this.board),
        turn: this.turn,
        castling: {
          w: { ...this.castling.w },
          b: { ...this.castling.b },
        },
        enPassant: this.enPassant,
        halfmoveClock: this.halfmoveClock,
        fullmoveNumber: this.fullmoveNumber,
      };
    }

    loadState(state) {
      this.board = deepCloneBoard(state.board);
      this.turn = state.turn;
      this.castling = {
        w: { ...state.castling.w },
        b: { ...state.castling.b },
      };
      this.enPassant = state.enPassant;
      this.halfmoveClock = state.halfmoveClock;
      this.fullmoveNumber = state.fullmoveNumber;
    }

    getPiece(square) {
      const coords = squareToCoords(square);
      if (!coords) return null;
      return this.board[coords.rank][coords.file];
    }

    setPiece(square, piece) {
      const coords = squareToCoords(square);
      if (!coords) return;
      this.board[coords.rank][coords.file] = piece;
    }

    getTurn() {
      return this.turn;
    }

    squares() {
      const squares = [];
      for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
          squares.push(coordsToSquare(file, rank));
        }
      }
      return squares;
    }

    pieces(color) {
      const positions = [];
      for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
          const piece = this.board[rank][file];
          if (piece && (!color || piece.color === color)) {
            positions.push({ square: coordsToSquare(file, rank), piece });
          }
        }
      }
      return positions;
    }

    moves(fromSquare) {
      const state = this.cloneState();
      const pseudoMoves = this.generatePseudoMoves(state, fromSquare);
      return pseudoMoves.filter((move) => this.isLegalMove(state, move));
    }

    makeMove({ from, to, promotion }) {
      const legalMoves = this.moves(from);
      const selected = legalMoves.find((move) => {
        if (move.to !== to) return false;
        if (move.promotion) {
          return move.promotion === (promotion || 'q');
        }
        return !promotion;
      });
      if (!selected) {
        return null;
      }
      const snapshot = this.cloneState();
      const applied = this.applyMove(snapshot, selected);
      this.loadState(applied.state);
      const notation = this.describeMove(applied, selected);
      const record = {
        ...selected,
        notation,
        captured: applied.capturedPiece,
        check: applied.check,
        checkmate: applied.checkmate,
        stalemate: applied.stalemate,
        draw: applied.draw,
        drawReason: applied.drawReason,
        prevState: applied.prevState,
        fullmoveNumber: this.turn === 'w' ? this.fullmoveNumber - 1 : this.fullmoveNumber,
      };
      this.history.push(record);
      return record;
    }

    undo() {
      if (!this.history.length) return null;
      const last = this.history.pop();
      const prevState = last.prevState;
      if (prevState) {
        this.loadState(prevState);
      }
      return last;
    }

    generatePseudoMoves(state, fromSquare) {
      const moves = [];
      const { board, turn } = state;
      const positions = [];
      if (fromSquare) {
        const coords = squareToCoords(fromSquare);
        if (!coords) return [];
        const piece = board[coords.rank][coords.file];
        if (!piece || piece.color !== turn) return [];
        positions.push({ square: fromSquare, piece });
      } else {
        for (let rank = 0; rank < 8; rank += 1) {
          for (let file = 0; file < 8; file += 1) {
            const piece = board[rank][file];
            if (piece && piece.color === turn) {
              positions.push({ square: coordsToSquare(file, rank), piece });
            }
          }
        }
      }

      positions.forEach(({ square, piece }) => {
        switch (piece.type) {
          case 'p':
            moves.push(...this.generatePawnMoves(state, square));
            break;
          case 'n':
            moves.push(...this.generateKnightMoves(state, square));
            break;
          case 'b':
            moves.push(...this.generateSlidingMoves(state, square, [
              { file: 1, rank: 1 },
              { file: 1, rank: -1 },
              { file: -1, rank: 1 },
              { file: -1, rank: -1 },
            ]));
            break;
          case 'r':
            moves.push(...this.generateSlidingMoves(state, square, [
              { file: 1, rank: 0 },
              { file: -1, rank: 0 },
              { file: 0, rank: 1 },
              { file: 0, rank: -1 },
            ]));
            break;
          case 'q':
            moves.push(...this.generateSlidingMoves(state, square, [
              { file: 1, rank: 0 },
              { file: -1, rank: 0 },
              { file: 0, rank: 1 },
              { file: 0, rank: -1 },
              { file: 1, rank: 1 },
              { file: 1, rank: -1 },
              { file: -1, rank: 1 },
              { file: -1, rank: -1 },
            ]));
            break;
          case 'k':
            moves.push(...this.generateKingMoves(state, square));
            break;
          default:
            break;
        }
      });

      return moves;
    }

    generatePawnMoves(state, square) {
      const moves = [];
      const coords = squareToCoords(square);
      const piece = state.board[coords.rank][coords.file];
      const dir = piece.color === 'w' ? -1 : 1;
      const startRank = piece.color === 'w' ? 6 : 1;
      const promotionRank = piece.color === 'w' ? 0 : 7;

      const forwardRank = coords.rank + dir;
      if (forwardRank >= 0 && forwardRank < 8 && !state.board[forwardRank][coords.file]) {
        moves.push(
          ...this.createPawnMove(square, coords.file, forwardRank, piece.color, false, false, promotionRank)
        );
        const doubleRank = coords.rank + dir * 2;
        if (coords.rank === startRank && !state.board[doubleRank][coords.file]) {
          const toSquare = coordsToSquare(coords.file, doubleRank);
          moves.push({
            from: square,
            to: toSquare,
            piece: 'p',
            color: piece.color,
            flags: { double: true },
          });
        }
      }

      [-1, 1].forEach((df) => {
        const file = coords.file + df;
        if (file < 0 || file > 7) return;
        const rank = coords.rank + dir;
        if (rank < 0 || rank > 7) return;
        const target = state.board[rank][file];
        if (target && target.color !== piece.color) {
          moves.push(
            ...this.createPawnMove(square, file, rank, piece.color, true, false, promotionRank, target)
          );
        } else if (!target) {
          const targetSquare = coordsToSquare(file, rank);
          if (state.enPassant && targetSquare === state.enPassant) {
            const captureRank = rank + (piece.color === 'w' ? 1 : -1);
            moves.push({
              from: square,
              to: targetSquare,
              piece: 'p',
              color: piece.color,
              flags: { enPassant: true, capture: true },
              captured: { type: 'p', color: opposite(piece.color) },
              captureSquare: coordsToSquare(file, captureRank),
            });
          }
        }
      });

      return moves;
    }

    createPawnMove(from, file, rank, color, capture, enPassant, promotionRank, capturedPiece) {
      const promotion = rank === promotionRank;
      const toSquare = coordsToSquare(file, rank);
      if (!promotion) {
        return [
          {
            from,
            to: toSquare,
            piece: 'p',
            color,
            captured: capture ? capturedPiece || true : null,
            flags: { capture: !!capture, enPassant: !!enPassant },
          },
        ];
      }
      const promotions = ['q', 'r', 'b', 'n'];
      return promotions.map((promo) => ({
        from,
        to: toSquare,
        piece: 'p',
        color,
        promotion: promo,
        captured: capture ? capturedPiece || true : null,
        flags: { capture: !!capture, promotion: true, enPassant: !!enPassant },
      }));
    }

    generateKnightMoves(state, square) {
      const moves = [];
      const coords = squareToCoords(square);
      const piece = state.board[coords.rank][coords.file];
      const deltas = [
        { file: 1, rank: 2 },
        { file: 2, rank: 1 },
        { file: -1, rank: 2 },
        { file: -2, rank: 1 },
        { file: 1, rank: -2 },
        { file: 2, rank: -1 },
        { file: -1, rank: -2 },
        { file: -2, rank: -1 },
      ];
      deltas.forEach(({ file: df, rank: dr }) => {
        const file = coords.file + df;
        const rank = coords.rank + dr;
        if (file < 0 || file > 7 || rank < 0 || rank > 7) return;
        const target = state.board[rank][file];
        if (!target || target.color !== piece.color) {
          moves.push({
            from: square,
            to: coordsToSquare(file, rank),
            piece: 'n',
            color: piece.color,
            captured: target || null,
            flags: { capture: !!target },
          });
        }
      });
      return moves;
    }

    generateSlidingMoves(state, square, directions) {
      const moves = [];
      const coords = squareToCoords(square);
      const piece = state.board[coords.rank][coords.file];
      directions.forEach(({ file: df, rank: dr }) => {
        let file = coords.file + df;
        let rank = coords.rank + dr;
        while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
          const target = state.board[rank][file];
          if (!target) {
            moves.push({
              from: square,
              to: coordsToSquare(file, rank),
              piece: piece.type,
              color: piece.color,
              captured: null,
              flags: {},
            });
          } else {
            if (target.color !== piece.color) {
              moves.push({
                from: square,
                to: coordsToSquare(file, rank),
                piece: piece.type,
                color: piece.color,
                captured: target,
                flags: { capture: true },
              });
            }
            break;
          }
          file += df;
          rank += dr;
        }
      });
      return moves;
    }

    generateKingMoves(state, square) {
      const moves = [];
      const coords = squareToCoords(square);
      const piece = state.board[coords.rank][coords.file];
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let df = -1; df <= 1; df += 1) {
          if (dr === 0 && df === 0) continue;
          const file = coords.file + df;
          const rank = coords.rank + dr;
          if (file < 0 || file > 7 || rank < 0 || rank > 7) continue;
          const target = state.board[rank][file];
          if (!target || target.color !== piece.color) {
            moves.push({
              from: square,
              to: coordsToSquare(file, rank),
              piece: 'k',
              color: piece.color,
              captured: target || null,
              flags: { capture: !!target },
            });
          }
        }
      }
      moves.push(...this.generateCastlingMoves(state, square));
      return moves;
    }

    generateCastlingMoves(state, square) {
      const moves = [];
      const coords = squareToCoords(square);
      const piece = state.board[coords.rank][coords.file];
      if (!piece || piece.type !== 'k') return moves;
      const rights = state.castling[piece.color];
      if (!rights) return moves;
      const enemy = opposite(piece.color);
      const kingSquare = coordsToSquare(coords.file, coords.rank);
      if (rights.k) {
        const squares = [
          { file: coords.file + 1, rank: coords.rank },
          { file: coords.file + 2, rank: coords.rank },
        ];
        const rookSquare = { file: 7, rank: coords.rank };
        if (
          squares.every(({ file }) => state.board[coords.rank][file] === null) &&
          state.board[rookSquare.rank][rookSquare.file] &&
          state.board[rookSquare.rank][rookSquare.file].type === 'r' &&
          state.board[rookSquare.rank][rookSquare.file].color === piece.color &&
          !this.isSquareAttacked(state, kingSquare, enemy) &&
          !this.isSquareAttacked(state, coordsToSquare(coords.file + 1, coords.rank), enemy) &&
          !this.isSquareAttacked(state, coordsToSquare(coords.file + 2, coords.rank), enemy)
        ) {
          moves.push({
            from: square,
            to: coordsToSquare(coords.file + 2, coords.rank),
            piece: 'k',
            color: piece.color,
            flags: { castle: 'k' },
          });
        }
      }
      if (rights.q) {
        const squares = [
          { file: coords.file - 1, rank: coords.rank },
          { file: coords.file - 2, rank: coords.rank },
          { file: coords.file - 3, rank: coords.rank },
        ];
        const rookSquare = { file: 0, rank: coords.rank };
        if (
          squares.every(({ file }) => state.board[coords.rank][file] === null) &&
          state.board[rookSquare.rank][rookSquare.file] &&
          state.board[rookSquare.rank][rookSquare.file].type === 'r' &&
          state.board[rookSquare.rank][rookSquare.file].color === piece.color &&
          !this.isSquareAttacked(state, kingSquare, enemy) &&
          !this.isSquareAttacked(state, coordsToSquare(coords.file - 1, coords.rank), enemy) &&
          !this.isSquareAttacked(state, coordsToSquare(coords.file - 2, coords.rank), enemy)
        ) {
          moves.push({
            from: square,
            to: coordsToSquare(coords.file - 2, coords.rank),
            piece: 'k',
            color: piece.color,
            flags: { castle: 'q' },
          });
        }
      }
      return moves;
    }

    isLegalMove(state, move) {
      const snapshot = {
        board: deepCloneBoard(state.board),
        turn: state.turn,
        castling: {
          w: { ...state.castling.w },
          b: { ...state.castling.b },
        },
        enPassant: state.enPassant,
        halfmoveClock: state.halfmoveClock,
        fullmoveNumber: state.fullmoveNumber,
      };
      const result = this.applyMove(snapshot, move, true);
      const kingColor = move.color;
      const inCheck = this.isKingAttacked(result.state, kingColor);
      return !inCheck;
    }

    applyMove(state, move, simulate) {
      const isSim = !!simulate;
      const prevState = isSim
        ? null
        : {
            board: deepCloneBoard(this.board),
            turn: this.turn,
            castling: {
              w: { ...this.castling.w },
              b: { ...this.castling.b },
            },
            enPassant: this.enPassant,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: this.fullmoveNumber,
          };

      const { board } = state;
      const from = squareToCoords(move.from);
      const to = squareToCoords(move.to);
      const movingPiece = board[from.rank][from.file];
      let capturedPiece = null;

      board[from.rank][from.file] = null;

      if (move.flags && move.flags.enPassant) {
        const captureRank = to.rank + (move.color === 'w' ? 1 : -1);
        capturedPiece = board[captureRank][to.file];
        board[captureRank][to.file] = null;
      } else {
        capturedPiece = board[to.rank][to.file];
      }

      const pieceToPlace = move.promotion
        ? { type: move.promotion, color: move.color }
        : movingPiece;
      board[to.rank][to.file] = pieceToPlace;

      if (move.flags && move.flags.castle) {
        if (move.flags.castle === 'k') {
          const rookFrom = { file: 7, rank: from.rank };
          const rookTo = { file: to.file - 1, rank: from.rank };
          board[rookTo.rank][rookTo.file] = board[rookFrom.rank][rookFrom.file];
          board[rookFrom.rank][rookFrom.file] = null;
        } else if (move.flags.castle === 'q') {
          const rookFrom = { file: 0, rank: from.rank };
          const rookTo = { file: to.file + 1, rank: from.rank };
          board[rookTo.rank][rookTo.file] = board[rookFrom.rank][rookFrom.file];
          board[rookFrom.rank][rookFrom.file] = null;
        }
      }

      state.enPassant = null;
      if (move.flags && move.flags.double) {
        const epRank = to.rank + (move.color === 'w' ? 1 : -1);
        state.enPassant = coordsToSquare(to.file, epRank);
      }

      state.castling = {
        w: { ...state.castling.w },
        b: { ...state.castling.b },
      };

      if (movingPiece.type === 'k') {
        state.castling[movingPiece.color].k = false;
        state.castling[movingPiece.color].q = false;
      }
      if (movingPiece.type === 'r') {
        const homeRank = movingPiece.color === 'w' ? 7 : 0;
        if (from.rank === homeRank) {
          if (from.file === 0) {
            state.castling[movingPiece.color].q = false;
          } else if (from.file === 7) {
            state.castling[movingPiece.color].k = false;
          }
        }
      }
      if (capturedPiece && capturedPiece.type === 'r') {
        const homeRank = capturedPiece.color === 'w' ? 7 : 0;
        const captureFile = move.flags && move.flags.enPassant ? squareToCoords(move.captureSquare).file : to.file;
        const captureRank = move.flags && move.flags.enPassant ? squareToCoords(move.captureSquare).rank : to.rank;
        if (captureRank === homeRank) {
          if (captureFile === 0) {
            state.castling[capturedPiece.color].q = false;
          } else if (captureFile === 7) {
            state.castling[capturedPiece.color].k = false;
          }
        }
      }

      if (movingPiece.type === 'p' || capturedPiece) {
        state.halfmoveClock = 0;
      } else {
        state.halfmoveClock += 1;
      }

      if (movingPiece.color === 'b') {
        state.fullmoveNumber += 1;
      }

      state.turn = opposite(move.color);

      const check = this.isKingAttacked(state, state.turn);
      let checkmate = false;
      let stalemate = false;
      let draw = false;
      let drawReason = null;
      if (!isSim) {
        const legalMovesNext = this.generatePseudoMoves(state).filter((nextMove) =>
          this.isLegalMove(state, nextMove)
        );
        const noMoves = legalMovesNext.length === 0;
        checkmate = noMoves && check;
        stalemate = noMoves && !check;
        if (stalemate) {
          draw = true;
          drawReason = 'stalemate';
        } else if (this.isInsufficientMaterial(state)) {
          draw = true;
          drawReason = 'insufficient';
        } else if (state.halfmoveClock >= 100) {
          draw = true;
          drawReason = 'fifty-move';
        }
      }

      return {
        state,
        capturedPiece,
        check,
        checkmate,
        stalemate,
        draw,
        drawReason,
        prevState,
      };
    }

    isKingAttacked(state, color) {
      const kingSquare = this.findKing(state, color);
      if (!kingSquare) return false;
      return this.isSquareAttacked(state, coordsToSquare(kingSquare.file, kingSquare.rank), opposite(color));
    }

    isSquareAttacked(state, square, attackerColor) {
      const coords = squareToCoords(square);
      if (!coords) return false;
      const { file, rank } = coords;

      const pawnDir = attackerColor === 'w' ? 1 : -1;
      const pawnRank = rank + pawnDir;
      for (let df of [-1, 1]) {
        const fileIndex = file + df;
        if (fileIndex < 0 || fileIndex > 7) continue;
        if (pawnRank < 0 || pawnRank > 7) continue;
        const piece = state.board[pawnRank][fileIndex];
        if (piece && piece.color === attackerColor && piece.type === 'p') {
          return true;
        }
      }

      const knightMoves = [
        { file: 1, rank: 2 },
        { file: 2, rank: 1 },
        { file: -1, rank: 2 },
        { file: -2, rank: 1 },
        { file: 1, rank: -2 },
        { file: 2, rank: -1 },
        { file: -1, rank: -2 },
        { file: -2, rank: -1 },
      ];
      for (let i = 0; i < knightMoves.length; i += 1) {
        const fileIndex = file + knightMoves[i].file;
        const rankIndex = rank + knightMoves[i].rank;
        if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) continue;
        const piece = state.board[rankIndex][fileIndex];
        if (piece && piece.color === attackerColor && piece.type === 'n') {
          return true;
        }
      }

      const directions = [
        { file: 1, rank: 0 },
        { file: -1, rank: 0 },
        { file: 0, rank: 1 },
        { file: 0, rank: -1 },
        { file: 1, rank: 1 },
        { file: 1, rank: -1 },
        { file: -1, rank: 1 },
        { file: -1, rank: -1 },
      ];

      for (let i = 0; i < directions.length; i += 1) {
        const { file: df, rank: dr } = directions[i];
        let fileIndex = file + df;
        let rankIndex = rank + dr;
        while (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
          const piece = state.board[rankIndex][fileIndex];
          if (piece) {
            if (piece.color === attackerColor) {
              if (
                (Math.abs(df) === Math.abs(dr) && (piece.type === 'b' || piece.type === 'q')) ||
                ((df === 0 || dr === 0) && (piece.type === 'r' || piece.type === 'q')) ||
                (Math.abs(df) <= 1 && Math.abs(dr) <= 1 && piece.type === 'k')
              ) {
                return true;
              }
            }
            break;
          }
          fileIndex += df;
          rankIndex += dr;
        }
      }

      return false;
    }

    findKing(state, color) {
      for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
          const piece = state.board[rank][file];
          if (piece && piece.type === 'k' && piece.color === color) {
            return { file, rank };
          }
        }
      }
      return null;
    }

    isInsufficientMaterial(state) {
      const pieces = [];
      for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
          const piece = state.board[rank][file];
          if (piece) {
            pieces.push({ ...piece, square: coordsToSquare(file, rank) });
          }
        }
      }
      const majorPieces = pieces.filter((p) => ['p', 'r', 'q'].includes(p.type));
      if (majorPieces.length > 0) return false;
      const bishops = pieces.filter((p) => p.type === 'b');
      const knights = pieces.filter((p) => p.type === 'n');
      if (bishops.length === 0 && knights.length <= 1) {
        return true;
      }
      if (knights.length === 0 && bishops.length > 0) {
        const colors = new Set();
        bishops.forEach((b) => {
          const { file, rank } = squareToCoords(b.square);
          colors.add((file + rank) % 2);
        });
        return colors.size === 1;
      }
      return false;
    }

    describeMove(result, move) {
      if (move.flags && move.flags.castle === 'k') return 'O-O';
      if (move.flags && move.flags.castle === 'q') return 'O-O-O';
      const pieceSymbol = this.getPieceSymbol(move.piece, move.color);
      const captureSymbol = move.flags && move.flags.capture ? '×' : '–';
      let promotionSuffix = '';
      if (move.promotion) {
        promotionSuffix = ` (= ${this.getPieceSymbol(move.promotion, move.color)})`;
      }
      const notation = `${pieceSymbol} ${move.from} ${captureSymbol} ${move.to}${promotionSuffix}`;
      const markers = [];
      if (result.checkmate) markers.push('#');
      else if (result.check) markers.push('+');
      else if (result.stalemate || result.draw) markers.push('½');
      return `${notation}${markers.length ? ' ' + markers.join('') : ''}`;
    }

    getPieceSymbol(type, color) {
      const symbols = {
        k: { w: '♔', b: '♚' },
        q: { w: '♕', b: '♛' },
        r: { w: '♖', b: '♜' },
        b: { w: '♗', b: '♝' },
        n: { w: '♘', b: '♞' },
        p: { w: '♙', b: '♟︎' },
      };
      return symbols[type][color];
    }

    exportBoard() {
      return deepCloneBoard(this.board);
    }
  }

  global.CrimsonChess = Chess;
})(typeof window !== 'undefined' ? window : globalThis);
