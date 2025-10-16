package com.crimsonknights.chess;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * A pure-Java port of the Crimson Knights chess engine that powered the browser version.
 * The implementation closely mirrors the JavaScript source so that the behaviour matches the
 * original web application.
 */
public class CrimsonChess {
    private static final char[] FILES = {'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'};

    private Piece[][] board;
    private PieceColor turn;
    private Map<PieceColor, CastlingRights> castling;
    private String enPassant;
    private int halfmoveClock;
    private int fullmoveNumber;
    private final List<MoveRecord> history = new ArrayList<>();

    public CrimsonChess() {
        reset();
    }

    /**
     * Resets the position to the standard chess starting layout.
     */
    public final void reset() {
        board = createInitialBoard();
        turn = PieceColor.WHITE;
        castling = new EnumMap<>(PieceColor.class);
        castling.put(PieceColor.WHITE, new CastlingRights(true, true));
        castling.put(PieceColor.BLACK, new CastlingRights(true, true));
        enPassant = null;
        halfmoveClock = 0;
        fullmoveNumber = 1;
        history.clear();
    }

    /**
     * Returns a deep copy of the current board.
     */
    public Piece[][] exportBoard() {
        return deepCloneBoard(board);
    }

    public Piece getPiece(String square) {
        Coordinate coord = squareToCoords(square);
        if (coord == null) {
            return null;
        }
        return board[coord.rank][coord.file];
    }

    public PieceColor getTurn() {
        return turn;
    }

    public List<Move> moves(String fromSquare) {
        GameState state = cloneState();
        List<Move> pseudoMoves = generatePseudoMoves(state, fromSquare);
        List<Move> legalMoves = new ArrayList<>();
        for (Move move : pseudoMoves) {
            if (isLegalMove(state, move)) {
                legalMoves.add(move.copy());
            }
        }
        return legalMoves;
    }

    public MoveRecord makeMove(String from, String to) {
        return makeMove(from, to, null);
    }

    public MoveRecord makeMove(String from, String to, Character promotionChoice) {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        List<Move> legalMoves = moves(from);
        Move selected = null;
        for (Move move : legalMoves) {
            if (!move.getTo().equals(to)) {
                continue;
            }
            if (move.getPromotion() != null) {
                char desired = promotionChoice == null ? 'q' : Character.toLowerCase(promotionChoice);
                if (move.getPromotion().getFenChar() == desired) {
                    selected = move;
                    break;
                }
            } else if (promotionChoice == null) {
                selected = move;
                break;
            }
        }
        if (selected == null) {
            return null;
        }

        GameState snapshot = cloneState();
        MoveApplication applied = applyMove(snapshot, selected, false);
        loadState(applied.state);
        String notation = describeMove(applied, selected);
        Piece capturedPiece = applied.capturedPiece;
        MoveRecord record = new MoveRecord(selected, notation, capturedPiece, applied.check,
                applied.checkmate, applied.stalemate, applied.draw, applied.drawReason,
                applied.prevState, turn == PieceColor.WHITE ? fullmoveNumber - 1 : fullmoveNumber);
        history.add(record);
        return record;
    }

    public MoveRecord undo() {
        if (history.isEmpty()) {
            return null;
        }
        MoveRecord last = history.remove(history.size() - 1);
        GameState prev = last.getPreviousState();
        if (prev != null) {
            loadState(prev);
        }
        return last;
    }

    public List<MoveRecord> getHistory() {
        return Collections.unmodifiableList(history);
    }

    private Piece[][] createInitialBoard() {
        Piece[][] newBoard = new Piece[8][8];
        PieceType[] pieceOrder = {
                PieceType.ROOK,
                PieceType.KNIGHT,
                PieceType.BISHOP,
                PieceType.QUEEN,
                PieceType.KING,
                PieceType.BISHOP,
                PieceType.KNIGHT,
                PieceType.ROOK
        };
        for (int file = 0; file < 8; file++) {
            newBoard[0][file] = new Piece(pieceOrder[file], PieceColor.BLACK);
            newBoard[1][file] = new Piece(PieceType.PAWN, PieceColor.BLACK);
            newBoard[6][file] = new Piece(PieceType.PAWN, PieceColor.WHITE);
            newBoard[7][file] = new Piece(pieceOrder[file], PieceColor.WHITE);
        }
        return newBoard;
    }

    private static Piece[][] deepCloneBoard(Piece[][] source) {
        Piece[][] clone = new Piece[8][8];
        for (int rank = 0; rank < 8; rank++) {
            for (int file = 0; file < 8; file++) {
                Piece piece = source[rank][file];
                clone[rank][file] = piece == null ? null : piece.copy();
            }
        }
        return clone;
    }

    private GameState cloneState() {
        Piece[][] boardCopy = deepCloneBoard(board);
        Map<PieceColor, CastlingRights> castlingCopy = new EnumMap<>(PieceColor.class);
        for (Map.Entry<PieceColor, CastlingRights> entry : castling.entrySet()) {
            castlingCopy.put(entry.getKey(), entry.getValue().copy());
        }
        return new GameState(boardCopy, turn, castlingCopy, enPassant, halfmoveClock, fullmoveNumber);
    }

    private void loadState(GameState state) {
        board = deepCloneBoard(state.getBoard());
        castling = new EnumMap<>(PieceColor.class);
        for (Map.Entry<PieceColor, CastlingRights> entry : state.getCastling().entrySet()) {
            castling.put(entry.getKey(), entry.getValue().copy());
        }
        turn = state.getTurn();
        enPassant = state.getEnPassant();
        halfmoveClock = state.getHalfmoveClock();
        fullmoveNumber = state.getFullmoveNumber();
    }

    private List<Move> generatePseudoMoves(GameState state, String fromSquare) {
        List<Move> moves = new ArrayList<>();
        if (fromSquare != null) {
            Coordinate coord = squareToCoords(fromSquare);
            if (coord == null) {
                return moves;
            }
            Piece piece = state.getBoard()[coord.rank][coord.file];
            if (piece == null || piece.getColor() != state.getTurn()) {
                return moves;
            }
            moves.addAll(generatePieceMoves(state, fromSquare, piece));
            return moves;
        }

        for (int rank = 0; rank < 8; rank++) {
            for (int file = 0; file < 8; file++) {
                Piece piece = state.getBoard()[rank][file];
                if (piece != null && piece.getColor() == state.getTurn()) {
                    String square = coordsToSquare(file, rank);
                    moves.addAll(generatePieceMoves(state, square, piece));
                }
            }
        }
        return moves;
    }

    private List<Move> generatePieceMoves(GameState state, String square, Piece piece) {
        switch (piece.getType()) {
            case PAWN:
                return generatePawnMoves(state, square);
            case KNIGHT:
                return generateKnightMoves(state, square);
            case BISHOP:
                return generateSlidingMoves(state, square, List.of(
                        new Coordinate(1, 1),
                        new Coordinate(1, -1),
                        new Coordinate(-1, 1),
                        new Coordinate(-1, -1)
                ));
            case ROOK:
                return generateSlidingMoves(state, square, List.of(
                        new Coordinate(1, 0),
                        new Coordinate(-1, 0),
                        new Coordinate(0, 1),
                        new Coordinate(0, -1)
                ));
            case QUEEN:
                return generateSlidingMoves(state, square, List.of(
                        new Coordinate(1, 0),
                        new Coordinate(-1, 0),
                        new Coordinate(0, 1),
                        new Coordinate(0, -1),
                        new Coordinate(1, 1),
                        new Coordinate(1, -1),
                        new Coordinate(-1, 1),
                        new Coordinate(-1, -1)
                ));
            case KING:
                return generateKingMoves(state, square);
            default:
                return List.of();
        }
    }

    private List<Move> generatePawnMoves(GameState state, String square) {
        List<Move> moves = new ArrayList<>();
        Coordinate coord = squareToCoords(square);
        Piece piece = state.getBoard()[coord.rank][coord.file];
        int dir = piece.getColor() == PieceColor.WHITE ? -1 : 1;
        int startRank = piece.getColor() == PieceColor.WHITE ? 6 : 1;
        int promotionRank = piece.getColor() == PieceColor.WHITE ? 0 : 7;

        int forwardRank = coord.rank + dir;
        if (forwardRank >= 0 && forwardRank < 8 && state.getBoard()[forwardRank][coord.file] == null) {
            moves.addAll(createPawnMove(square, coord.file, forwardRank, piece.getColor(), false,
                    false, promotionRank, null));
            int doubleRank = coord.rank + dir * 2;
            if (coord.rank == startRank && state.getBoard()[doubleRank][coord.file] == null) {
                MoveFlags flags = new MoveFlags();
                flags.setDoublePush(true);
                moves.add(new Move(square, coordsToSquare(coord.file, doubleRank), PieceType.PAWN,
                        piece.getColor(), null, null, flags, null));
            }
        }

        for (int df : new int[]{-1, 1}) {
            int file = coord.file + df;
            if (file < 0 || file > 7) {
                continue;
            }
            int rank = coord.rank + dir;
            if (rank < 0 || rank > 7) {
                continue;
            }
            Piece target = state.getBoard()[rank][file];
            if (target != null && target.getColor() != piece.getColor()) {
                moves.addAll(createPawnMove(square, file, rank, piece.getColor(), true,
                        false, promotionRank, target));
            } else if (target == null) {
                String targetSquare = coordsToSquare(file, rank);
                if (state.getEnPassant() != null && state.getEnPassant().equals(targetSquare)) {
                    MoveFlags flags = new MoveFlags();
                    flags.setEnPassant(true);
                    flags.setCapture(true);
                    Piece captured = new Piece(PieceType.PAWN, piece.getColor().opposite());
                    String captureSquare = coordsToSquare(file, rank + (piece.getColor() == PieceColor.WHITE ? 1 : -1));
                    moves.add(new Move(square, targetSquare, PieceType.PAWN, piece.getColor(), captured,
                            null, flags, captureSquare));
                }
            }
        }

        return moves;
    }

    private List<Move> createPawnMove(String from, int file, int rank, PieceColor color,
                                      boolean capture, boolean enPassant, int promotionRank,
                                      Piece capturedPiece) {
        List<Move> moves = new ArrayList<>();
        boolean promotion = rank == promotionRank;
        String to = coordsToSquare(file, rank);
        MoveFlags baseFlags = new MoveFlags();
        baseFlags.setCapture(capture);
        baseFlags.setEnPassant(enPassant);
        if (!promotion) {
            moves.add(new Move(from, to, PieceType.PAWN, color, capturedPiece, null, baseFlags, null));
            return moves;
        }
        baseFlags.setPromotion(true);
        for (PieceType promotionType : List.of(PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT)) {
            MoveFlags promotionFlags = baseFlags.copy();
            moves.add(new Move(from, to, PieceType.PAWN, color, capturedPiece, promotionType, promotionFlags, null));
        }
        return moves;
    }

    private List<Move> generateKnightMoves(GameState state, String square) {
        List<Move> moves = new ArrayList<>();
        Coordinate coord = squareToCoords(square);
        Piece piece = state.getBoard()[coord.rank][coord.file];
        int[][] deltas = {
                {1, 2}, {2, 1}, {-1, 2}, {-2, 1},
                {1, -2}, {2, -1}, {-1, -2}, {-2, -1}
        };
        for (int[] delta : deltas) {
            int file = coord.file + delta[0];
            int rank = coord.rank + delta[1];
            if (file < 0 || file > 7 || rank < 0 || rank > 7) {
                continue;
            }
            Piece target = state.getBoard()[rank][file];
            if (target == null || target.getColor() != piece.getColor()) {
                MoveFlags flags = new MoveFlags();
                if (target != null) {
                    flags.setCapture(true);
                }
                moves.add(new Move(square, coordsToSquare(file, rank), PieceType.KNIGHT,
                        piece.getColor(), target, null, flags, null));
            }
        }
        return moves;
    }

    private List<Move> generateSlidingMoves(GameState state, String square, List<Coordinate> directions) {
        List<Move> moves = new ArrayList<>();
        Coordinate coord = squareToCoords(square);
        Piece piece = state.getBoard()[coord.rank][coord.file];
        for (Coordinate direction : directions) {
            int file = coord.file + direction.file;
            int rank = coord.rank + direction.rank;
            while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                Piece target = state.getBoard()[rank][file];
                if (target == null) {
                    moves.add(new Move(square, coordsToSquare(file, rank), piece.getType(),
                            piece.getColor(), null, null, new MoveFlags(), null));
                } else {
                    if (target.getColor() != piece.getColor()) {
                        MoveFlags flags = new MoveFlags();
                        flags.setCapture(true);
                        moves.add(new Move(square, coordsToSquare(file, rank), piece.getType(),
                                piece.getColor(), target, null, flags, null));
                    }
                    break;
                }
                file += direction.file;
                rank += direction.rank;
            }
        }
        return moves;
    }

    private List<Move> generateKingMoves(GameState state, String square) {
        List<Move> moves = new ArrayList<>();
        Coordinate coord = squareToCoords(square);
        Piece piece = state.getBoard()[coord.rank][coord.file];
        for (int dr = -1; dr <= 1; dr++) {
            for (int df = -1; df <= 1; df++) {
                if (dr == 0 && df == 0) {
                    continue;
                }
                int file = coord.file + df;
                int rank = coord.rank + dr;
                if (file < 0 || file > 7 || rank < 0 || rank > 7) {
                    continue;
                }
                Piece target = state.getBoard()[rank][file];
                if (target == null || target.getColor() != piece.getColor()) {
                    MoveFlags flags = new MoveFlags();
                    if (target != null) {
                        flags.setCapture(true);
                    }
                    moves.add(new Move(square, coordsToSquare(file, rank), PieceType.KING,
                            piece.getColor(), target, null, flags, null));
                }
            }
        }
        moves.addAll(generateCastlingMoves(state, square));
        return moves;
    }

    private List<Move> generateCastlingMoves(GameState state, String square) {
        List<Move> moves = new ArrayList<>();
        Coordinate coord = squareToCoords(square);
        Piece piece = state.getBoard()[coord.rank][coord.file];
        if (piece == null || piece.getType() != PieceType.KING) {
            return moves;
        }
        CastlingRights rights = state.getCastling().get(piece.getColor());
        if (rights == null) {
            return moves;
        }
        PieceColor enemy = piece.getColor().opposite();
        String kingSquare = coordsToSquare(coord.file, coord.rank);
        if (rights.canCastleKingSide()) {
            Coordinate rookSquare = new Coordinate(7, coord.rank);
            if (state.getBoard()[rookSquare.rank][rookSquare.file] != null
                    && state.getBoard()[rookSquare.rank][rookSquare.file].getType() == PieceType.ROOK
                    && state.getBoard()[rookSquare.rank][rookSquare.file].getColor() == piece.getColor()
                    && state.getBoard()[coord.rank][coord.file + 1] == null
                    && state.getBoard()[coord.rank][coord.file + 2] == null
                    && !isSquareAttacked(state, kingSquare, enemy)
                    && !isSquareAttacked(state, coordsToSquare(coord.file + 1, coord.rank), enemy)
                    && !isSquareAttacked(state, coordsToSquare(coord.file + 2, coord.rank), enemy)) {
                MoveFlags flags = new MoveFlags();
                flags.setCastle(MoveFlags.CastlingSide.KING_SIDE);
                moves.add(new Move(square, coordsToSquare(coord.file + 2, coord.rank), PieceType.KING,
                        piece.getColor(), null, null, flags, null));
            }
        }
        if (rights.canCastleQueenSide()) {
            Coordinate rookSquare = new Coordinate(0, coord.rank);
            if (state.getBoard()[rookSquare.rank][rookSquare.file] != null
                    && state.getBoard()[rookSquare.rank][rookSquare.file].getType() == PieceType.ROOK
                    && state.getBoard()[rookSquare.rank][rookSquare.file].getColor() == piece.getColor()
                    && state.getBoard()[coord.rank][coord.file - 1] == null
                    && state.getBoard()[coord.rank][coord.file - 2] == null
                    && state.getBoard()[coord.rank][coord.file - 3] == null
                    && !isSquareAttacked(state, kingSquare, enemy)
                    && !isSquareAttacked(state, coordsToSquare(coord.file - 1, coord.rank), enemy)
                    && !isSquareAttacked(state, coordsToSquare(coord.file - 2, coord.rank), enemy)) {
                MoveFlags flags = new MoveFlags();
                flags.setCastle(MoveFlags.CastlingSide.QUEEN_SIDE);
                moves.add(new Move(square, coordsToSquare(coord.file - 2, coord.rank), PieceType.KING,
                        piece.getColor(), null, null, flags, null));
            }
        }
        return moves;
    }

    private boolean isLegalMove(GameState state, Move move) {
        GameState snapshot = state.copy();
        MoveApplication result = applyMove(snapshot, move, true);
        return !isKingAttacked(result.state, move.getColor());
    }

    private MoveApplication applyMove(GameState state, Move move, boolean simulate) {
        GameState prevState = null;
        if (!simulate) {
            prevState = cloneState();
        }

        Piece[][] boardRef = state.getBoard();
        Coordinate from = squareToCoords(move.getFrom());
        Coordinate to = squareToCoords(move.getTo());
        Piece movingPiece = boardRef[from.rank][from.file];
        Piece capturedPiece;
        boardRef[from.rank][from.file] = null;

        if (move.getFlags().isEnPassant()) {
            Coordinate captureCoord = squareToCoords(move.getCaptureSquare());
            capturedPiece = boardRef[captureCoord.rank][captureCoord.file];
            boardRef[captureCoord.rank][captureCoord.file] = null;
        } else {
            capturedPiece = boardRef[to.rank][to.file];
        }

        Piece pieceToPlace = move.getPromotion() == null
                ? movingPiece
                : new Piece(move.getPromotion(), move.getColor());
        boardRef[to.rank][to.file] = pieceToPlace;

        if (move.getFlags().getCastle() != null) {
            if (move.getFlags().getCastle() == MoveFlags.CastlingSide.KING_SIDE) {
                Coordinate rookFrom = new Coordinate(7, from.rank);
                Coordinate rookTo = new Coordinate(to.file - 1, from.rank);
                boardRef[rookTo.rank][rookTo.file] = boardRef[rookFrom.rank][rookFrom.file];
                boardRef[rookFrom.rank][rookFrom.file] = null;
            } else {
                Coordinate rookFrom = new Coordinate(0, from.rank);
                Coordinate rookTo = new Coordinate(to.file + 1, from.rank);
                boardRef[rookTo.rank][rookTo.file] = boardRef[rookFrom.rank][rookFrom.file];
                boardRef[rookFrom.rank][rookFrom.file] = null;
            }
        }

        state.setEnPassant(null);
        if (move.getFlags().isDoublePush()) {
            int epRank = to.rank + (move.getColor() == PieceColor.WHITE ? 1 : -1);
            state.setEnPassant(coordsToSquare(to.file, epRank));
        }

        Map<PieceColor, CastlingRights> castlingCopy = new EnumMap<>(PieceColor.class);
        for (Map.Entry<PieceColor, CastlingRights> entry : state.getCastling().entrySet()) {
            castlingCopy.put(entry.getKey(), entry.getValue().copy());
        }
        state.setCastling(castlingCopy);

        if (movingPiece.getType() == PieceType.KING) {
            CastlingRights rights = castlingCopy.get(movingPiece.getColor());
            rights.setKingSide(false);
            rights.setQueenSide(false);
        }
        if (movingPiece.getType() == PieceType.ROOK) {
            int homeRank = movingPiece.getColor() == PieceColor.WHITE ? 7 : 0;
            if (from.rank == homeRank) {
                CastlingRights rights = castlingCopy.get(movingPiece.getColor());
                if (from.file == 0) {
                    rights.setQueenSide(false);
                } else if (from.file == 7) {
                    rights.setKingSide(false);
                }
            }
        }
        if (capturedPiece != null && capturedPiece.getType() == PieceType.ROOK) {
            int homeRank = capturedPiece.getColor() == PieceColor.WHITE ? 7 : 0;
            int captureFile = move.getFlags().isEnPassant()
                    ? squareToCoords(move.getCaptureSquare()).file
                    : to.file;
            int captureRank = move.getFlags().isEnPassant()
                    ? squareToCoords(move.getCaptureSquare()).rank
                    : to.rank;
            if (captureRank == homeRank) {
                CastlingRights enemyRights = castlingCopy.get(capturedPiece.getColor());
                if (captureFile == 0) {
                    enemyRights.setQueenSide(false);
                } else if (captureFile == 7) {
                    enemyRights.setKingSide(false);
                }
            }
        }

        if (movingPiece.getType() == PieceType.PAWN || capturedPiece != null) {
            state.setHalfmoveClock(0);
        } else {
            state.setHalfmoveClock(state.getHalfmoveClock() + 1);
        }

        if (movingPiece.getColor() == PieceColor.BLACK) {
            state.setFullmoveNumber(state.getFullmoveNumber() + 1);
        }

        state.setTurn(move.getColor().opposite());

        boolean check = isKingAttacked(state, state.getTurn());
        boolean checkmate = false;
        boolean stalemate = false;
        boolean draw = false;
        String drawReason = null;
        if (!simulate) {
            List<Move> replies = new ArrayList<>();
            replies.addAll(generatePseudoMoves(state, null));
            replies.removeIf(reply -> !isLegalMove(state, reply));
            boolean noMoves = replies.isEmpty();
            checkmate = noMoves && check;
            stalemate = noMoves && !check;
            if (stalemate) {
                draw = true;
                drawReason = "stalemate";
            } else if (isInsufficientMaterial(state)) {
                draw = true;
                drawReason = "insufficient";
            } else if (state.getHalfmoveClock() >= 100) {
                draw = true;
                drawReason = "fifty-move";
            }
        }

        return new MoveApplication(state, capturedPiece, check, checkmate, stalemate, draw, drawReason, prevState);
    }

    private boolean isKingAttacked(GameState state, PieceColor color) {
        Coordinate kingSquare = findKing(state, color);
        if (kingSquare == null) {
            return false;
        }
        return isSquareAttacked(state, coordsToSquare(kingSquare.file, kingSquare.rank), color.opposite());
    }

    private Coordinate findKing(GameState state, PieceColor color) {
        for (int rank = 0; rank < 8; rank++) {
            for (int file = 0; file < 8; file++) {
                Piece piece = state.getBoard()[rank][file];
                if (piece != null && piece.getType() == PieceType.KING && piece.getColor() == color) {
                    return new Coordinate(file, rank);
                }
            }
        }
        return null;
    }

    private boolean isSquareAttacked(GameState state, String square, PieceColor attackerColor) {
        Coordinate coord = squareToCoords(square);
        if (coord == null) {
            return false;
        }
        int file = coord.file;
        int rank = coord.rank;

        int pawnDir = attackerColor == PieceColor.WHITE ? 1 : -1;
        int pawnRank = rank + pawnDir;
        for (int df : new int[]{-1, 1}) {
            int fileIndex = file + df;
            if (fileIndex < 0 || fileIndex > 7 || pawnRank < 0 || pawnRank > 7) {
                continue;
            }
            Piece piece = state.getBoard()[pawnRank][fileIndex];
            if (piece != null && piece.getColor() == attackerColor && piece.getType() == PieceType.PAWN) {
                return true;
            }
        }

        int[][] knightMoves = {
                {1, 2}, {2, 1}, {-1, 2}, {-2, 1},
                {1, -2}, {2, -1}, {-1, -2}, {-2, -1}
        };
        for (int[] delta : knightMoves) {
            int fileIndex = file + delta[0];
            int rankIndex = rank + delta[1];
            if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
                continue;
            }
            Piece piece = state.getBoard()[rankIndex][fileIndex];
            if (piece != null && piece.getColor() == attackerColor && piece.getType() == PieceType.KNIGHT) {
                return true;
            }
        }

        Coordinate[] directions = {
                new Coordinate(1, 0), new Coordinate(-1, 0), new Coordinate(0, 1), new Coordinate(0, -1),
                new Coordinate(1, 1), new Coordinate(1, -1), new Coordinate(-1, 1), new Coordinate(-1, -1)
        };
        for (Coordinate direction : directions) {
            int fileIndex = file + direction.file;
            int rankIndex = rank + direction.rank;
            while (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
                Piece piece = state.getBoard()[rankIndex][fileIndex];
                if (piece != null) {
                    if (piece.getColor() == attackerColor) {
                        boolean diagonal = Math.abs(direction.file) == Math.abs(direction.rank);
                        boolean orthogonal = direction.file == 0 || direction.rank == 0;
                        if ((diagonal && (piece.getType() == PieceType.BISHOP || piece.getType() == PieceType.QUEEN))
                                || (orthogonal && (piece.getType() == PieceType.ROOK || piece.getType() == PieceType.QUEEN))
                                || (Math.abs(direction.file) <= 1 && Math.abs(direction.rank) <= 1
                                && piece.getType() == PieceType.KING)) {
                            return true;
                        }
                    }
                    break;
                }
                fileIndex += direction.file;
                rankIndex += direction.rank;
            }
        }
        return false;
    }

    private boolean isInsufficientMaterial(GameState state) {
        List<Piece> pieces = new ArrayList<>();
        List<String> squares = new ArrayList<>();
        for (int rank = 0; rank < 8; rank++) {
            for (int file = 0; file < 8; file++) {
                Piece piece = state.getBoard()[rank][file];
                if (piece != null) {
                    pieces.add(piece);
                    squares.add(coordsToSquare(file, rank));
                }
            }
        }
        boolean hasMajor = pieces.stream()
                .anyMatch(p -> p.getType() == PieceType.PAWN || p.getType() == PieceType.ROOK || p.getType() == PieceType.QUEEN);
        if (hasMajor) {
            return false;
        }
        long bishops = pieces.stream().filter(p -> p.getType() == PieceType.BISHOP).count();
        long knights = pieces.stream().filter(p -> p.getType() == PieceType.KNIGHT).count();
        if (bishops == 0 && knights <= 1) {
            return true;
        }
        if (knights == 0 && bishops > 0) {
            Set<Integer> colors = new HashSet<>();
            for (int i = 0; i < pieces.size(); i++) {
                if (pieces.get(i).getType() == PieceType.BISHOP) {
                    Coordinate coord = squareToCoords(squares.get(i));
                    colors.add((coord.file + coord.rank) % 2);
                }
            }
            return colors.size() == 1;
        }
        return false;
    }

    public String getPieceSymbol(PieceType type, PieceColor color) {
        switch (type) {
            case KING:
                return color == PieceColor.WHITE ? "\u2654" : "\u265A";
            case QUEEN:
                return color == PieceColor.WHITE ? "\u2655" : "\u265B";
            case ROOK:
                return color == PieceColor.WHITE ? "\u2656" : "\u265C";
            case BISHOP:
                return color == PieceColor.WHITE ? "\u2657" : "\u265D";
            case KNIGHT:
                return color == PieceColor.WHITE ? "\u2658" : "\u265E";
            case PAWN:
                return color == PieceColor.WHITE ? "\u2659" : "\u265F";
            default:
                throw new IllegalStateException("Unexpected piece: " + type);
        }
    }

    private String describeMove(MoveApplication result, Move move) {
        if (move.getFlags().getCastle() == MoveFlags.CastlingSide.KING_SIDE) {
            return "O-O";
        }
        if (move.getFlags().getCastle() == MoveFlags.CastlingSide.QUEEN_SIDE) {
            return "O-O-O";
        }
        String pieceSymbol = getPieceSymbol(move.getPiece(), move.getColor());
        String captureSymbol = move.getFlags().isCapture() ? "×" : "–";
        String promotionSuffix = "";
        if (move.getPromotion() != null) {
            promotionSuffix = " (= " + getPieceSymbol(move.getPromotion(), move.getColor()) + ")";
        }
        String notation = pieceSymbol + " " + move.getFrom() + " " + captureSymbol + " " + move.getTo() + promotionSuffix;
        StringBuilder markers = new StringBuilder();
        if (result.checkmate) {
            markers.append('#');
        } else if (result.check) {
            markers.append('+');
        } else if (result.stalemate || result.draw) {
            markers.append('½');
        }
        if (markers.length() > 0) {
            notation = notation + " " + markers;
        }
        return notation;
    }

    private static Coordinate squareToCoords(String square) {
        if (square == null || square.length() != 2) {
            return null;
        }
        int file = -1;
        for (int i = 0; i < FILES.length; i++) {
            if (FILES[i] == square.charAt(0)) {
                file = i;
                break;
            }
        }
        if (file == -1) {
            return null;
        }
        int rank = 8 - Character.getNumericValue(square.charAt(1));
        if (rank < 0 || rank > 7) {
            return null;
        }
        return new Coordinate(file, rank);
    }

    private static String coordsToSquare(int file, int rank) {
        return "" + FILES[file] + (8 - rank);
    }

    private static final class Coordinate {
        final int file;
        final int rank;

        Coordinate(int file, int rank) {
            this.file = file;
            this.rank = rank;
        }
    }

    private static final class MoveApplication {
        final GameState state;
        final Piece capturedPiece;
        final boolean check;
        final boolean checkmate;
        final boolean stalemate;
        final boolean draw;
        final String drawReason;
        final GameState prevState;

        MoveApplication(GameState state, Piece capturedPiece, boolean check, boolean checkmate,
                        boolean stalemate, boolean draw, String drawReason, GameState prevState) {
            this.state = state;
            this.capturedPiece = capturedPiece;
            this.check = check;
            this.checkmate = checkmate;
            this.stalemate = stalemate;
            this.draw = draw;
            this.drawReason = drawReason;
            this.prevState = prevState;
        }
    }
}
