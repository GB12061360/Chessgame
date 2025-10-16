package com.crimsonknights.chess;

/**
 * Extends a move with annotations recorded in the move history.
 */
public final class MoveRecord extends Move {
    private final String notation;
    private final Piece capturedPiece;
    private final boolean check;
    private final boolean checkmate;
    private final boolean stalemate;
    private final boolean draw;
    private final String drawReason;
    private final GameState previousState;
    private final int fullmoveNumber;

    public MoveRecord(Move base, String notation, Piece capturedPiece, boolean check,
                      boolean checkmate, boolean stalemate, boolean draw, String drawReason,
                      GameState previousState, int fullmoveNumber) {
        super(base.getFrom(), base.getTo(), base.getPiece(), base.getColor(), base.getCaptured(),
                base.getPromotion(), base.getFlags(), base.getCaptureSquare());
        this.notation = notation;
        this.capturedPiece = capturedPiece;
        this.check = check;
        this.checkmate = checkmate;
        this.stalemate = stalemate;
        this.draw = draw;
        this.drawReason = drawReason;
        this.previousState = previousState;
        this.fullmoveNumber = fullmoveNumber;
    }

    public String getNotation() {
        return notation;
    }

    public Piece getCapturedPiece() {
        return capturedPiece;
    }

    public boolean isCheck() {
        return check;
    }

    public boolean isCheckmate() {
        return checkmate;
    }

    public boolean isStalemate() {
        return stalemate;
    }

    public boolean isDraw() {
        return draw;
    }

    public String getDrawReason() {
        return drawReason;
    }

    public GameState getPreviousState() {
        return previousState;
    }

    public int getFullmoveNumber() {
        return fullmoveNumber;
    }
}
