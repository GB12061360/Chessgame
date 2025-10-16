(() => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const boardEl = document.getElementById('chessboard');
  const boardContainer = document.querySelector('.board-container');
  const statusText = document.getElementById('status-text');
  const checkText = document.getElementById('check-text');
  const moveLog = document.getElementById('move-log');
  const resetBtn = document.getElementById('reset-btn');
  const horizontalCoords = document.querySelector('.coordinates.horizontal');
  const verticalCoords = document.querySelector('.coordinates.vertical');
  const promotionDialog = document.getElementById('promotion-dialog');
  const promotionOptions = document.getElementById('promotion-options');
  const whiteCaptures = document.getElementById('white-captures');
  const blackCaptures = document.getElementById('black-captures');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const aiCommentary = document.getElementById('ai-commentary');

  const game = new window.CrimsonChess();
  const soundscape = new window.Soundscape();
  const confetti = new window.ConfettiController(confettiCanvas);
  const bot = new window.CrimsonBot(game, { randomness: 0.45, aggression: 1 });

  const boardSquares = new Map();
  const capturedPieces = { w: [], b: [] };

  let selectedSquare = null;
  let highlightedTargets = [];
  let pendingPromotion = null;
  let lastMoveSquares = [];
  let isBotThinking = false;
  let botMoveTimeout = null;
  let boardExploded = false;

  const playerColor = 'w';
  const botColor = 'b';

  const aiQuips = {
    start: ['Awaiting your opening move.'],
    thinking: [
      'Calculating a cunning reply…',
      'Let me consult the crimson codex…',
      'Thinking… the embers whisper strategies.',
    ],
    playerMove: [
      'Intriguing choice.',
      'Bold move, challenger.',
      'Your strategy unfolds elegantly.',
    ],
    playerCapture: [
      'Ouch! That piece was loyal.',
      'You strike with precision.',
      'An impressive capture.',
    ],
    playerCheck: [
      'So daring—you threaten my king!',
      'Check? I did not foresee that spark.',
    ],
    capture: [
      'Another trophy for the crimson legion.',
      'I claim this square in my name.',
      'A swift capture keeps things interesting.',
    ],
    check: [
      'Check! Your king quivers.',
      'Beware, your king stands exposed.',
    ],
    neutral: [
      'Let us see how you answer.',
      'The board glows with possibility.',
    ],
    defeat: [
      'The crimson legion prevails!',
      'Another victory scorched into memory.',
    ],
    victory: [
      'What a dazzling checkmate—you win!',
      'I concede. Your tactics blaze bright.',
    ],
    draw: [
      'A truce forged in embers.',
      'Balanced flames—neither side yields.',
    ],
  };

  function buildBoard() {
    boardEl.innerHTML = '';
    boardSquares.clear();
    for (let rankIndex = 0; rankIndex < ranks.length; rankIndex += 1) {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const squareName = `${files[fileIndex]}${ranks[rankIndex]}`;
        const square = document.createElement('div');
        square.classList.add('square');
        const isDark = (fileIndex + rankIndex) % 2 === 1;
        square.classList.add(isDark ? 'dark' : 'light');
        square.dataset.square = squareName;
        square.addEventListener('click', () => handleSquareClick(squareName));
        boardEl.appendChild(square);
        boardSquares.set(squareName, square);
      }
    }
  }

  function renderCoordinates() {
    horizontalCoords.innerHTML = '';
    verticalCoords.innerHTML = '';
    files.forEach((file) => {
      const span = document.createElement('span');
      span.textContent = file.toUpperCase();
      horizontalCoords.appendChild(span);
    });
    ranks.forEach((rank) => {
      const span = document.createElement('span');
      span.textContent = rank;
      verticalCoords.appendChild(span);
    });
  }

  function renderBoard() {
    const board = game.exportBoard();
    for (let rankIndex = 0; rankIndex < ranks.length; rankIndex += 1) {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const squareName = `${files[fileIndex]}${ranks[rankIndex]}`;
        const square = boardSquares.get(squareName);
        if (!square) continue;
        square.innerHTML = '';
        const piece = board[rankIndex][fileIndex];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.classList.add('piece', piece.color === 'w' ? 'piece-white' : 'piece-black');
          pieceEl.textContent = game.getPieceSymbol(piece.type, piece.color);
          square.appendChild(pieceEl);
        }
      }
    }
  }

  function clearSelection() {
    if (selectedSquare) {
      const square = boardSquares.get(selectedSquare);
      if (square) square.classList.remove('highlight');
    }
    highlightedTargets.forEach((target) => {
      const square = boardSquares.get(target.square);
      if (!square) return;
      square.classList.remove('target', 'capture');
    });
    highlightedTargets = [];
    selectedSquare = null;
  }

  function handleSquareClick(square) {
    if (pendingPromotion) return;
    if (isBotThinking) return;
    const squarePiece = game.getPiece(square);
    const turn = game.getTurn();

    if (selectedSquare === square) {
      clearSelection();
      return;
    }

    const targetMove = highlightedTargets.find((move) => move.square === square);
    if (selectedSquare && targetMove) {
      if (targetMove.move.promotion) {
        showPromotionDialog(selectedSquare, square, targetMove.move);
      } else {
        performMove(targetMove.move);
      }
      return;
    }

    if (squarePiece && squarePiece.color === turn) {
      selectSquare(square);
    } else {
      clearSelection();
    }
  }

  function selectSquare(square) {
    clearSelection();
    const squareEl = boardSquares.get(square);
    if (!squareEl) return;
    const moves = game.moves(square);
    if (!moves.length) return;
    selectedSquare = square;
    squareEl.classList.add('highlight');
    highlightedTargets = moves.map((move) => {
      const targetSquare = boardSquares.get(move.to);
      if (targetSquare) {
        targetSquare.classList.add(move.flags && move.flags.capture ? 'capture' : 'target');
      }
      return { square: move.to, move };
    });
  }

  function showPromotionDialog(from, to, move) {
    pendingPromotion = { from, to, move };
    promotionOptions.innerHTML = '';
    const promotionMoves = game
      .moves(from)
      .filter((candidate) => candidate.to === to && candidate.promotion);
    promotionMoves.forEach((candidate) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'promotion-button';
      button.dataset.promotion = candidate.promotion;
      const pieceName = promotionLabel(candidate.promotion);
      button.innerHTML = `${game.getPieceSymbol(candidate.promotion, candidate.color)} ${pieceName}`;
      button.addEventListener('click', () => {
        promotionDialog.classList.add('hidden');
        pendingPromotion = null;
        performMove({ ...move, promotion: candidate.promotion });
      });
      promotionOptions.appendChild(button);
    });
    promotionDialog.classList.remove('hidden');
  }

  function promotionLabel(piece) {
    switch (piece) {
      case 'q':
        return 'Queen';
      case 'r':
        return 'Rook';
      case 'b':
        return 'Bishop';
      case 'n':
        return 'Knight';
      default:
        return piece.toUpperCase();
    }
  }

  function randomEntry(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function setAICommentary(type) {
    if (!aiCommentary) return;
    const pool = aiQuips[type];
    if (!pool || !pool.length) return;
    aiCommentary.textContent = randomEntry(pool);
  }

  function applyLastMoveHighlight(move) {
    lastMoveSquares.forEach((squareName) => {
      const squareEl = boardSquares.get(squareName);
      if (squareEl) {
        squareEl.classList.remove('last-move');
      }
    });
    lastMoveSquares = [];
    if (!move) return;
    [move.from, move.to].forEach((squareName) => {
      if (!squareName) return;
      const squareEl = boardSquares.get(squareName);
      if (squareEl) {
        squareEl.classList.add('last-move');
        lastMoveSquares.push(squareName);
      }
    });
  }

  function flashBoard(effectClass) {
    if (!boardContainer || !effectClass) return;
    boardContainer.classList.remove('capture-flash', 'check-flash');
    void boardContainer.offsetWidth;
    boardContainer.classList.add(effectClass);
    window.setTimeout(() => {
      if (boardContainer) {
        boardContainer.classList.remove(effectClass);
      }
    }, 420);
  }

  function handleVisualEffects(move) {
    applyLastMoveHighlight(move);
    if (move.checkmate) return;
    if (move.flags && move.flags.capture) {
      flashBoard('capture-flash');
    } else if (move.check) {
      flashBoard('check-flash');
    }
  }

  function triggerBoardExplosion() {
    if (!boardContainer || boardExploded) return;
    boardExploded = true;
    boardContainer.classList.add('explode');
    boardSquares.forEach((square) => {
      if (!square) return;
      const blastX = `${(Math.random() - 0.5) * 200}px`;
      const blastY = `${(Math.random() - 0.5) * 200}px`;
      const blastRot = `${(Math.random() - 0.5) * 260}deg`;
      square.style.setProperty('--blast-x', blastX);
      square.style.setProperty('--blast-y', blastY);
      square.style.setProperty('--blast-rot', blastRot);
    });
  }

  function resetBoardExplosion() {
    if (!boardContainer) return;
    boardExploded = false;
    boardContainer.classList.remove('explode');
    boardSquares.forEach((square) => {
      if (!square) return;
      square.style.removeProperty('--blast-x');
      square.style.removeProperty('--blast-y');
      square.style.removeProperty('--blast-rot');
    });
  }

  function scheduleBotMove() {
    if (isBotThinking || boardExploded) return;
    if (game.getTurn() !== botColor) return;
    isBotThinking = true;
    setAICommentary('thinking');
    if (botMoveTimeout) {
      window.clearTimeout(botMoveTimeout);
    }
    botMoveTimeout = window.setTimeout(() => {
      botMoveTimeout = null;
      if (game.getTurn() !== botColor) {
        isBotThinking = false;
        return;
      }
      const move = bot.chooseMove();
      if (!move) {
        isBotThinking = false;
        return;
      }
      performMove(move);
    }, 450 + Math.random() * 500);
  }

  function handlePostMove(result) {
    if (result.checkmate) {
      if (result.color === playerColor) {
        setAICommentary('victory');
      } else if (result.color === botColor) {
        setAICommentary('defeat');
      }
      if (botMoveTimeout) {
        window.clearTimeout(botMoveTimeout);
        botMoveTimeout = null;
      }
      isBotThinking = false;
      return;
    }

    if (result.draw) {
      setAICommentary('draw');
      if (botMoveTimeout) {
        window.clearTimeout(botMoveTimeout);
        botMoveTimeout = null;
      }
      isBotThinking = false;
      return;
    }

    if (result.color === playerColor) {
      if (result.check) {
        setAICommentary('playerCheck');
      } else if (result.flags && result.flags.capture) {
        setAICommentary('playerCapture');
      } else {
        setAICommentary('playerMove');
      }
      scheduleBotMove();
    } else if (result.color === botColor) {
      isBotThinking = false;
      if (result.check) {
        setAICommentary('check');
      } else if (result.flags && result.flags.capture) {
        setAICommentary('capture');
      } else {
        setAICommentary('neutral');
      }
    }
  }

  function performMove(move) {
    const result = game.makeMove(move);
    if (!result) {
      clearSelection();
      return;
    }
    promotionDialog.classList.add('hidden');
    pendingPromotion = null;
    clearSelection();
    renderBoard();
    handleVisualEffects(result);
    updateCaptures(result);
    updateMoveLog(result);
    updateStatus(result);
    highlightCheck(result);
    playSounds(result);
    handlePostMove(result);
  }

  function updateCaptures(move) {
    if (!move.captured) return;
    const color = move.captured.color;
    capturedPieces[color].push(move.captured.type);
    renderCaptures();
  }

  function renderCaptures() {
    const order = ['q', 'r', 'b', 'n', 'p'];
    whiteCaptures.innerHTML = '';
    blackCaptures.innerHTML = '';
    order.forEach((pieceType) => {
      capturedPieces.w
        .filter((piece) => piece === pieceType)
        .forEach(() => {
          const span = document.createElement('span');
          span.classList.add('piece', 'piece-white');
          span.textContent = game.getPieceSymbol(pieceType, 'w');
          whiteCaptures.appendChild(span);
        });
      capturedPieces.b
        .filter((piece) => piece === pieceType)
        .forEach(() => {
          const span = document.createElement('span');
          span.classList.add('piece', 'piece-black');
          span.textContent = game.getPieceSymbol(pieceType, 'b');
          blackCaptures.appendChild(span);
        });
    });
  }

  function updateMoveLog(move) {
    if (move.color === 'w' || moveLog.children.length === 0) {
      const item = document.createElement('li');
      item.dataset.moveNumber = move.fullmoveNumber;
      const number = document.createElement('span');
      number.className = 'move-number';
      number.textContent = `${move.fullmoveNumber}.`;
      const whiteSpan = document.createElement('span');
      whiteSpan.className = 'move-white';
      whiteSpan.textContent = move.notation;
      item.append(number, ' ', whiteSpan);
      moveLog.appendChild(item);
    } else {
      const item = moveLog.lastElementChild;
      const blackSpan = document.createElement('span');
      blackSpan.className = 'move-black';
      blackSpan.textContent = move.notation;
      item.append(' ', blackSpan);
    }
    moveLog.scrollTop = moveLog.scrollHeight;
  }

  function updateStatus(move) {
    const turnName = game.getTurn() === 'w' ? 'White' : 'Black';
    if (move.checkmate) {
      statusText.textContent = `${move.color === 'w' ? 'White' : 'Black'} wins by checkmate!`;
      checkText.textContent = 'Checkmate!';
      checkText.classList.remove('hidden');
      if (move.color === playerColor) {
        confetti.burst();
      } else if (move.color === botColor) {
        triggerBoardExplosion();
      }
    } else if (move.draw) {
      statusText.textContent = 'Game drawn';
      switch (move.drawReason) {
        case 'stalemate':
          checkText.textContent = 'Stalemate';
          break;
        case 'insufficient':
          checkText.textContent = 'Insufficient material';
          break;
        case 'fifty-move':
          checkText.textContent = 'Fifty-move rule';
          break;
        default:
          checkText.textContent = 'Drawn position';
          break;
      }
      checkText.classList.remove('hidden');
    } else {
      statusText.textContent = `${turnName} to move`;
      if (move.check) {
        checkText.textContent = `${turnName} is in check!`;
        checkText.classList.remove('hidden');
      } else {
        checkText.classList.add('hidden');
      }
    }
  }

  function highlightCheck(move) {
    boardSquares.forEach((squareEl) => squareEl.classList.remove('king-danger'));
    const colorToMove = game.getTurn();
    if (!move.check && !move.checkmate) return;
    const kingSquare = findKingSquare(colorToMove);
    if (kingSquare) {
      const squareEl = boardSquares.get(kingSquare);
      if (squareEl) {
        squareEl.classList.add('king-danger');
      }
    }
  }

  function findKingSquare(color) {
    const board = game.exportBoard();
    for (let rankIndex = 0; rankIndex < ranks.length; rankIndex += 1) {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const piece = board[rankIndex][fileIndex];
        if (piece && piece.type === 'k' && piece.color === color) {
          return `${files[fileIndex]}${ranks[rankIndex]}`;
        }
      }
    }
    return null;
  }

  function playSounds(move) {
    if (move.checkmate) {
      if (move.color === playerColor) {
        soundscape.playWin();
      } else {
        soundscape.playDefeat();
      }
    } else if (move.check) {
      soundscape.playCheck();
    } else if (move.flags && move.flags.capture) {
      soundscape.playCapture();
    } else {
      soundscape.playMove();
    }
  }

  function resetGame() {
    game.reset();
    capturedPieces.w.length = 0;
    capturedPieces.b.length = 0;
    moveLog.innerHTML = '';
    renderCaptures();
    renderBoard();
    resetBoardExplosion();
    applyLastMoveHighlight(null);
    clearSelection();
    if (botMoveTimeout) {
      window.clearTimeout(botMoveTimeout);
      botMoveTimeout = null;
    }
    isBotThinking = false;
    pendingPromotion = null;
    statusText.textContent = 'White to move';
    checkText.classList.add('hidden');
    if (boardContainer) {
      boardContainer.classList.remove('capture-flash', 'check-flash');
    }
    setAICommentary('start');
  }

  resetBtn.addEventListener('click', () => {
    resetGame();
  });

  promotionDialog.addEventListener('click', (event) => {
    if (event.target === promotionDialog) {
      promotionDialog.classList.add('hidden');
      pendingPromotion = null;
    }
  });

  buildBoard();
  renderCoordinates();
  renderBoard();
  renderCaptures();
  statusText.textContent = 'White to move';
  setAICommentary('start');
})();
